import type { StyleSpecification } from "maplibre-gl";

// The finder's own MapLibre style over OpenFreeMap's OpenMapTiles vector tiles, drawn to
// look like the hand-drawn maps in design-handoff/hall-finder: paper ground, white
// buildings with thin ink outlines, soft green parks, small spaced caps street labels.
// Street labels use OpenFreeMap's Noto Sans Bold glyphs (no Martian Mono glyph set yet).
const INK = "#16161D";
const ROAD = "#FBFAF7";

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    omt: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution: "© OpenStreetMap contributors · OpenFreeMap",
    },
  },
  layers: [
    { id: "ground", type: "background", paint: { "background-color": "#EDEBE3" } },
    { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": "#DCE6CF" } },
    {
      id: "green",
      type: "fill",
      source: "omt",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland", "wetland"]]],
      paint: { "fill-color": "#DCE6CF", "fill-opacity": 0.85 },
    },
    { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": "#CFDCE6" } },
    {
      id: "paths",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 14,
      filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ROAD, "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.8, 18, 3.5] },
    },
    {
      id: "roads",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      filter: ["!", ["in", ["get", "class"], ["literal", ["path", "track", "rail", "transit", "ferry", "cable_car"]]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ROAD,
        "line-width": [
          "interpolate", ["exponential", 1.6], ["zoom"],
          13, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 3, ["secondary", "tertiary"], 2.2, 1.2],
          18, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 22, ["secondary", "tertiary"], 18, 11],
        ],
      },
    },
    { id: "buildings", type: "fill", source: "omt", "source-layer": "building", minzoom: 14, paint: { "fill-color": "#FFFFFF" } },
    {
      id: "building-lines",
      type: "line",
      source: "omt",
      "source-layer": "building",
      minzoom: 14,
      paint: { "line-color": INK, "line-opacity": 0.35, "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.4, 18, 1.1] },
    },
    {
      id: "street-labels",
      type: "symbol",
      source: "omt",
      "source-layer": "transportation_name",
      minzoom: 15,
      layout: {
        "symbol-placement": "line",
        "text-field": ["upcase", ["coalesce", ["get", "name"], ""]],
        "text-font": ["Noto Sans Bold"],
        "text-size": 10,
        "text-letter-spacing": 0.2,
        "text-max-angle": 30,
      },
      paint: { "text-color": "#55555F", "text-halo-color": ROAD, "text-halo-width": 1.6 },
    },
  ],
};
