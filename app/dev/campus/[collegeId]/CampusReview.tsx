"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Year = "first" | "upper" | "any" | null;
type Hall = { dormId: string; name: string; lng: number | null; lat: number | null; pin: "name" | "address" | "manual" | null; osm: string | null; year: Year; yearSource: string | null };
type Place = { id: string; name: string; short: string; kind: "academic" | "dining" | "gym" | "library"; codes: string[]; aliases: string[]; lng: number; lat: number; osm: string };
export type Campus = { collegeId: string; generatedAt: string; bounds: [number, number, number, number]; halls: Hall[]; places: Place[] };
type Routes = Record<string, { minutes: number | null; path: string | null }>;

const PIN_COLOR: Record<string, string> = { name: "#16a34a", address: "#2563eb", manual: "#ea580c", none: "#dc2626" };
const KIND_COLOR: Record<Place["kind"], string> = { academic: "#475569", dining: "#d97706", gym: "#0891b2", library: "#7c3aed" };
const STYLE = "https://tiles.openfreemap.org/styles/positron";

// Google encoded polyline (precision 5) -> [lng, lat][]
function decode(str: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  const next = () => {
    let shift = 0, result = 0, b: number;
    do {
      b = str.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += next();
    lng += next();
    pts.push([lng / 1e5, lat / 1e5]);
  }
  return pts;
}

export default function CampusReview({ campus }: { campus: Campus }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const markerClass = useRef<typeof Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [halls, setHalls] = useState(campus.halls);
  const [query, setQuery] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Routes | null>(null);
  const [hallId, setHallId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const place = campus.places.find((p) => p.id === placeId) ?? null;

  useEffect(() => {
    let gone = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (gone || !box.current) return;
      ml.setWorkerUrl("/api/dev/campus?worker");
      markerClass.current = ml.Marker;
      const m = new ml.Map({ container: box.current, style: STYLE, bounds: campus.bounds, fitBoundsOptions: { padding: 40 } });
      m.addControl(new ml.NavigationControl(), "top-right");
      m.on("load", () => {
        m.addSource("paths", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "paths",
          type: "line",
          source: "paths",
          layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["case", ["get", "selected"], 1, 0] },
          paint: { "line-color": ["case", ["get", "selected"], "#db2777", "#64748b"], "line-width": ["case", ["get", "selected"], 4, 1.5], "line-opacity": ["case", ["get", "selected"], 1, 0.45] },
        });
        m.addSource("places", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: campus.places.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, short: p.short, kind: p.kind } })),
          },
        });
        m.addLayer({
          id: "places",
          type: "circle",
          source: "places",
          paint: {
            "circle-radius": 4,
            "circle-color": ["match", ["get", "kind"], "dining", KIND_COLOR.dining, "gym", KIND_COLOR.gym, "library", KIND_COLOR.library, KIND_COLOR.academic],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });
        m.addLayer({
          id: "place-labels",
          type: "symbol",
          source: "places",
          minzoom: 16,
          layout: { "text-field": ["get", "short"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 0.9], "text-anchor": "top" },
          paint: { "text-color": "#334155", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
        });
        m.on("click", "places", (e) => setPlaceId(String(e.features?.[0]?.properties?.id)));
        m.on("mouseenter", "places", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "places", () => (m.getCanvas().style.cursor = ""));
        setReady(true);
      });
      map.current = m;
    })();
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
  }, [campus]);

  async function save(dormId: string, patch: { pin?: [number, number]; year?: Year; yearSource?: string }) {
    const res = await fetch("/api/dev/campus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collegeId: campus.collegeId, dormId, ...patch }),
    });
    if (!res.ok) return setStatus(`Couldn't save ${dormId} (${res.status}).`);
    setHalls((list) =>
      list.map((h) => {
        if (h.dormId !== dormId) return h;
        const moved = patch.pin ? { lng: patch.pin[0], lat: patch.pin[1], pin: "manual" as const } : {};
        const tagged = "year" in patch ? { year: patch.year ?? null, yearSource: patch.yearSource ?? null } : {};
        return { ...h, ...moved, ...tagged };
      }),
    );
    setStatus(`Saved ${dormId} to data/campus/overrides/${campus.collegeId}.json. Rebuild to re-route.`);
  }

  // Hall pins: rebuilt whenever a hall changes (61 markers is cheap).
  useEffect(() => {
    const m = map.current;
    const MarkerClass = markerClass.current;
    if (!ready || !m || !MarkerClass) return;
    const made = halls
      .filter((h) => h.lng !== null && h.lat !== null)
      .map((h) => {
        const el = document.createElement("button");
        el.type = "button";
        el.title = `${h.name} (${h.pin ?? "no pin"})`;
        el.style.cssText = `width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 ${h.dormId === hallId ? 3 : 1}px #0f172a;background:${PIN_COLOR[h.pin ?? "none"]};cursor:grab`;
        el.addEventListener("click", () => setHallId(h.dormId));
        const marker = new MarkerClass({ element: el, draggable: true }).setLngLat([h.lng!, h.lat!]).addTo(m);
        marker.on("dragend", () => {
          const { lng, lat } = marker.getLngLat();
          save(h.dormId, { pin: [lng, lat] });
        });
        return marker;
      });
    return () => made.forEach((mk) => mk.remove());
    // save is stable enough for a dev page; markers rebuild on every hall change anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, halls, hallId]);

  useEffect(() => {
    if (!placeId) return setRoutes(null);
    let gone = false;
    fetch(`/api/dev/campus?collegeId=${campus.collegeId}&place=${encodeURIComponent(placeId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Routes | null) => !gone && setRoutes(data));
    return () => {
      gone = true;
    };
  }, [campus.collegeId, placeId]);

  useEffect(() => {
    const src = map.current?.getSource("paths") as GeoJSONSource | undefined;
    if (!ready || !src) return;
    src.setData({
      type: "FeatureCollection",
      features: Object.entries(routes ?? {})
        .filter(([, r]) => r.path)
        .map(([dormId, r]) => ({ type: "Feature", geometry: { type: "LineString", coordinates: decode(r.path!) }, properties: { selected: dormId === hallId } })),
    });
    map.current?.setPaintProperty("places", "circle-radius", ["case", ["==", ["get", "id"], placeId ?? ""], 8, 4]);
  }, [ready, routes, hallId, placeId]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return campus.places.filter((p) => [p.name, p.short, ...p.codes, ...p.aliases].some((s) => s.toLowerCase().includes(q))).slice(0, 30);
  }, [campus.places, query]);

  const rows = [...halls].sort((a, b) =>
    routes ? (routes[a.dormId]?.minutes ?? Infinity) - (routes[b.dormId]?.minutes ?? Infinity) : a.name.localeCompare(b.name),
  );
  const fly = (lng: number | null, lat: number | null) => lng !== null && lat !== null && map.current?.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 16) });

  function changeYear(h: Hall, value: string) {
    const year = (value || null) as Year;
    const source = window.prompt(`Source URL for ${h.name}: ${value || "unknown"}`, h.yearSource?.startsWith("http") ? h.yearSource : "");
    if (source === null) return;
    save(h.dormId, { year, yearSource: source.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white text-[13px] text-slate-900 md:flex-row">
      <aside className="flex max-h-[45vh] w-full flex-col overflow-y-auto border-b border-slate-200 md:max-h-none md:w-[380px] md:border-b-0 md:border-r">
        <div className="space-y-2 border-b border-slate-200 p-4">
          <h1 className="text-base font-semibold">Campus review · {campus.collegeId}</h1>
          <p className="text-slate-500">
            Built {campus.generatedAt.slice(0, 16).replace("T", " ")} UTC · {halls.length} halls · {campus.places.length} places
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(PIN_COLOR).map(([k, c]) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-full" style={{ background: c }} /> {k}
              </span>
            ))}
          </p>
          <p className="text-slate-500">
            Drag a pin or change a year tag; it saves to the overrides file. Then run{" "}
            <code className="rounded bg-slate-100 px-1">node scripts/campus/build.mjs {campus.collegeId}</code> and reload.
          </p>
          {status && <p className="rounded bg-amber-50 px-2 py-1 text-amber-900">{status}</p>}
        </div>

        <div className="space-y-2 border-b border-slate-200 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places by name, code or alias"
            className="w-full rounded border border-slate-300 px-2 py-1.5"
          />
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPlaceId(p.id);
                fly(p.lng, p.lat);
              }}
              className="block w-full rounded px-2 py-1 text-left hover:bg-slate-100"
            >
              <span className="font-medium">{p.name}</span> <span className="text-slate-500">{[p.kind, ...p.codes].join(" · ")}</span>
            </button>
          ))}
          {place && (
            <div className="rounded bg-slate-50 p-2">
              <p className="font-medium">{place.name}</p>
              <p className="text-slate-500">
                {place.kind} · short “{place.short}” · {place.osm}
              </p>
              <p>Codes: {place.codes.join(", ") || "none"}</p>
              <p>Aliases: {place.aliases.join(", ") || "none"}</p>
            </div>
          )}
        </div>

        <ul className="divide-y divide-slate-100">
          {rows.map((h) => (
            <li key={h.dormId} className={`flex items-center gap-2 px-4 py-1.5 ${h.dormId === hallId ? "bg-pink-50" : ""}`}>
              <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: PIN_COLOR[h.pin ?? "none"] }} />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left hover:underline"
                onClick={() => {
                  setHallId(h.dormId);
                  fly(h.lng, h.lat);
                }}
              >
                {h.name}
              </button>
              {routes && <span className="tabular-nums text-slate-600">{routes[h.dormId]?.minutes ?? "–"} min</span>}
              {h.lng === null && (
                <button
                  type="button"
                  className="rounded border border-slate-300 px-1.5"
                  onClick={() => {
                    const c = map.current?.getCenter();
                    if (c) save(h.dormId, { pin: [c.lng, c.lat] });
                  }}
                >
                  Pin here
                </button>
              )}
              <select value={h.year ?? ""} onChange={(e) => changeYear(h, e.target.value)} className="rounded border border-slate-300 px-1">
                <option value="first">first</option>
                <option value="upper">upper</option>
                <option value="any">any</option>
                <option value="">unknown</option>
              </select>
            </li>
          ))}
        </ul>
      </aside>
      <div ref={box} className="min-h-0 flex-1" />
    </div>
  );
}
