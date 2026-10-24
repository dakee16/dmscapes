"use client";

// The finder's campus map: MapLibre on OpenFreeMap tiles with our own style. Loaded with
// next/dynamic (ssr: false) from the finder only, so no other page pays for MapLibre.
// The place and hall lists beside it are the accessible alternative; the map is visual.
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE } from "./map-style";
import styles from "./HallFinder.module.css";

/** color / ink: a roommate's colour and the text that reads on it (a room's Halls section). */
export interface MapPlace { n: number; lng: number; lat: number; label: string; color?: string; ink?: string }
/** plain: not ranked yet; locked: ranked with Plus; rank: shaded by t (0 best … 1 worst); top: the #1 hall. */
export interface MapHall { dormId: string; name: string; lng: number; lat: number; tone: "plain" | "locked" | "rank" | "top"; t?: number }
export interface MapRoute { line: [number, number][]; minutes: number; color?: string }

interface Props {
  bounds: [number, number, number, number];
  places: MapPlace[];
  halls: MapHall[];
  routes: MapRoute[];
  /** The hall the routes start from (labelled "1 · Beaver Hall" on the map). */
  focus?: { name: string; rank: number; lng: number; lat: number } | null;
  picking?: boolean;
  onPick?: (lngLat: [number, number]) => void;
  onHallClick?: (dormId: string) => void;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(className: string, text?: string): HTMLDivElement {
  const d = document.createElement("div");
  d.className = className;
  if (text !== undefined) d.textContent = text;
  return d;
}

export default function FinderMap({ bounds, places, halls, routes, focus, picking, onPick, onHallClick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  // The last frame asked for, re-applied when the box changes size (the layout settles
  // after the map is made, e.g. while results load), so the fit matches the final size.
  const lastFit = useRef<import("maplibre-gl").LngLatBounds | null>(null);
  const pickRef = useRef(onPick);
  const hallRef = useRef(onHallClick);
  pickRef.current = picking ? onPick : undefined;
  hallRef.current = onHallClick;

  useEffect(() => {
    let gone = false;
    let resize: ResizeObserver | undefined;
    (async () => {
      const lib = await import("maplibre-gl");
      if (gone || !box.current) return;
      ml.current = lib;
      lib.setWorkerUrl(`/api/hall-finder/worker?v=${lib.getVersion()}`);
      const m = new lib.Map({
        container: box.current,
        style: MAP_STYLE,
        bounds,
        fitBoundsOptions: { padding: 40 },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      m.addControl(new lib.AttributionControl({ compact: false }), "bottom-right");
      m.on("load", () => {
        m.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "routes-halo", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FFFFFF", "line-width": 8 } });
        m.addLayer({ id: "routes", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["coalesce", ["get", "color"], "#2449FF"], "line-width": 4 } });
        m.addSource("halls", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "halls",
          type: "circle",
          source: "halls",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 5, 17, 9],
            "circle-color": [
              "match", ["get", "tone"],
              "plain", "#FFFFFF",
              "locked", "#E4E1D8",
              "top", "#FFD83D",
              ["interpolate", ["linear"], ["get", "t"], 0, "#2449FF", 0.5, "#8FA4FF", 1, "#E3E8FF"],
            ],
            "circle-stroke-color": ["match", ["get", "tone"], "locked", "#B9B6AC", "#16161D"],
            "circle-stroke-width": ["match", ["get", "tone"], "top", 2.5, 1.5],
          },
        });
        m.on("click", "halls", (e) => {
          const id = e.features?.[0]?.properties?.dormId;
          if (id && hallRef.current) hallRef.current(String(id));
        });
        m.on("mouseenter", "halls", () => {
          if (hallRef.current) m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", "halls", () => {
          m.getCanvas().style.cursor = "";
        });
        m.on("click", (e) => pickRef.current?.([Number(e.lngLat.lng.toFixed(5)), Number(e.lngLat.lat.toFixed(5))]));
        setReady(true);
      });
      map.current = m;
      resize = new ResizeObserver(() => {
        m.resize();
        if (lastFit.current) m.fitBounds(lastFit.current, { padding: 70, maxZoom: 17, duration: 0 });
      });
      resize.observe(box.current);
    })();
    return () => {
      gone = true;
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // The map is created once; bounds only seed the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const src = map.current?.getSource("halls") as GeoJSONSource | undefined;
    if (!ready || !src) return;
    src.setData({
      type: "FeatureCollection",
      features: halls.map((h) => ({ type: "Feature", geometry: { type: "Point", coordinates: [h.lng, h.lat] }, properties: { dormId: h.dormId, tone: h.tone, t: h.t ?? 0 } })),
    });
  }, [ready, halls]);

  useEffect(() => {
    const src = map.current?.getSource("routes") as GeoJSONSource | undefined;
    if (!ready || !src) return;
    src.setData({ type: "FeatureCollection", features: routes.map((r) => ({ type: "Feature", geometry: { type: "LineString", coordinates: r.line }, properties: r.color ? { color: r.color } : {} })) });
  }, [ready, routes]);

  // Place pins, the focused hall's label and minute labels are HTML markers: crisp type, no glyphs.
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib) return;
    const made: Marker[] = [];
    for (const p of places) {
      const node = el(styles.mapPlace);
      if (p.color) node.style.setProperty("--hf-place", p.color);
      if (p.ink) node.style.setProperty("--hf-place-ink", p.ink);
      node.append(el(styles.mapPlaceN, String(p.n)), el(styles.mapPlaceLabel, p.label));
      made.push(new lib.Marker({ element: node, anchor: "left", offset: [-13, 0] }).setLngLat([p.lng, p.lat]).addTo(m));
    }
    if (focus) made.push(new lib.Marker({ element: el(styles.mapFocus, `${focus.rank} · ${focus.name}`), anchor: "bottom", offset: [0, -12] }).setLngLat([focus.lng, focus.lat]).addTo(m));
    // Minute labels sit 60% along each route; one under 3 min would land on the hall's own label.
    for (const r of routes) {
      const mid = r.minutes >= 3 ? r.line[Math.floor(r.line.length * 0.6)] : null;
      if (mid) made.push(new lib.Marker({ element: el(styles.mapMinutes, `${Math.round(r.minutes)} min`) }).setLngLat(mid).addTo(m));
    }
    return () => made.forEach((mk) => mk.remove());
  }, [ready, places, focus, routes]);

  // Frame what matters: your places, plus the focused hall when there is one.
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib) return;
    const pts: [number, number][] = [...places.map((p) => [p.lng, p.lat] as [number, number]), ...(focus ? [[focus.lng, focus.lat] as [number, number]] : [])];
    if (!pts.length) return;
    const b = new lib.LngLatBounds(pts[0], pts[0]);
    for (const p of pts) b.extend(p);
    lastFit.current = b;
    m.fitBounds(b, { padding: 70, maxZoom: 17, duration: reduced() ? 0 : 600 });
  }, [ready, places, focus]);

  return (
    <div
      ref={box}
      className={`${styles.mapCanvas} ${picking ? styles.mapPicking : ""}`}
      role="region"
      aria-label={picking ? "Campus map. Click a spot to drop a pin there." : "Campus map. The list beside it has the same information."}
    />
  );
}
