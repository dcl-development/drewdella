/**
 * Recolor OpenFreeMap Liberty so the basemap reads like Google Maps.
 * Vector tiles stay OpenFreeMap; these overrides only change paint and
 * label fonts (Roboto via fonts.openmaptiles.org).
 */

export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const ROBOTO_GLYPHS = "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";

const LAND = "#f5f3ef";
const WATER = "#aadaff";
const PARK = "#c6e8b8";
const PARK_SOFT = "#d5edc8";
const HIGHWAY = "#f6d365";
const HIGHWAY_EDGE = "#e3c04a";
const ROAD = "#ffffff";
const ROAD_EDGE = "#ddd9d3";
const BUILDING = "#ebe6df";
const LABEL = "#5f6368";
const LABEL_HALO = "#f7f5f2";

function paint(map, id, prop, value) {
  try {
    map.setPaintProperty(id, prop, value);
  } catch {
    /* layer missing or property unsupported */
  }
}

function layout(map, id, prop, value) {
  try {
    map.setLayoutProperty(id, prop, value);
  } catch {
    /* layer missing or property unsupported */
  }
}

function roadRole(id) {
  if (
    /rail|transit|one_way|arrow|shield|area_pattern|runway|taxiway|aeroway|hatching/.test(
      id
    )
  ) {
    return null;
  }
  if (!/^(road|tunnel|bridge)_/.test(id)) return null;
  if (/motorway|trunk|primary/.test(id)) return "highway";
  if (/path|pedestrian|track|service|minor|link/.test(id) && !/casing/.test(id)) {
    return "path";
  }
  if (/casing/.test(id)) return "casing";
  return "street";
}

function applyLabelFont(map, id) {
  let stack;
  try {
    stack = map.getLayoutProperty(id, "text-font");
  } catch {
    return;
  }
  if (!Array.isArray(stack) || !stack.length) return;
  const emphasis = stack.some((name) =>
    /medium|bold|semibold/i.test(String(name))
  );
  layout(
    map,
    id,
    "text-font",
    emphasis
      ? ["Roboto Medium", "Arial Unicode MS Bold"]
      : ["Roboto Regular", "Arial Unicode MS Regular"]
  );
}

export function applyGoogleBasemap(map) {
  const layers = map.getStyle()?.layers || [];

  for (const layer of layers) {
    const { id, type } = layer;

    if (id === "background") {
      paint(map, id, "background-color", LAND);
    }

    if (id === "natural_earth") {
      paint(map, id, "raster-opacity", 0.35);
    }

    if (id === "park" || id === "park_outline") {
      paint(map, id, "fill-color", PARK);
      paint(map, id, "line-color", PARK_SOFT);
    }

    if (id === "landcover_wood" || id === "landcover_grass") {
      paint(map, id, "fill-color", id === "landcover_wood" ? PARK : PARK_SOFT);
      paint(map, id, "fill-opacity", 0.55);
    }

    if (id === "landcover_ice") {
      paint(map, id, "fill-color", "#e4eef5");
    }

    if (id === "landcover_sand") {
      paint(map, id, "fill-color", "#f6e7c8");
    }

    if (id === "landuse_residential") {
      paint(map, id, "fill-color", "#f3f1ee");
    }

    if (
      id === "landuse_pitch" ||
      id === "landuse_track" ||
      id === "landuse_cemetery"
    ) {
      paint(map, id, "fill-color", PARK_SOFT);
    }

    if (id === "landuse_hospital") {
      paint(map, id, "fill-color", "#f4e4e4");
    }

    if (id === "landuse_school") {
      paint(map, id, "fill-color", "#f3efe4");
    }

    if (id === "water") {
      paint(map, id, "fill-color", WATER);
    }

    if (/^waterway_/.test(id)) {
      paint(map, id, "line-color", "#93cef8");
    }

    if (id === "building" || id === "building-3d") {
      paint(map, id, "fill-color", BUILDING);
      paint(map, id, "fill-outline-color", "#e0dbd4");
    }

    if (id === "aeroway_fill") {
      paint(map, id, "fill-color", "#e7eef6");
    }

    if (type === "line") {
      const role = roadRole(id);
      if (role) {
        const isCasing = /casing/.test(id);
        const color =
          role === "highway"
            ? isCasing
              ? HIGHWAY_EDGE
              : HIGHWAY
            : role === "path"
              ? isCasing
                ? "#d9d4cc"
                : ROAD
              : isCasing
                ? ROAD_EDGE
                : ROAD;
        paint(map, id, "line-color", color);
      }
    }

    if (type === "symbol") {
      applyLabelFont(map, id);

      if (/highway-name|road_shield|highway-shield/.test(id)) {
        paint(map, id, "text-color", LABEL);
        paint(map, id, "text-halo-color", LABEL_HALO);
        paint(map, id, "text-halo-width", 1.15);
      } else if (/label_city|label_town|label_village|label_state|label_country/.test(id)) {
        paint(map, id, "text-color", "#202124");
        paint(map, id, "text-halo-color", "#ffffff");
      } else if (/poi_|airport|label_other/.test(id)) {
        paint(map, id, "text-color", "#616161");
        paint(map, id, "text-halo-color", "#ffffff");
        paint(map, id, "text-halo-width", 1);
      } else if (/water_name|waterway_line_label/.test(id)) {
        paint(map, id, "text-color", "#3d7ea6");
        paint(map, id, "text-halo-color", "rgba(255,255,255,0.8)");
      }
    }
  }
}
