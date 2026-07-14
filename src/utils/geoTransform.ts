/**
 * Content-build-time geometry conversion pipeline: traced CAD points (PDF points,
 * from Sheets A2-A4) → local feet → real lat/lon. Isolated from rendering — the
 * SVG game view never calls this at runtime, only the content build step does,
 * baking both local-feet and lat/lon onto each traced feature ahead of time.
 *
 * Confirmed from source (Sheets A2/A3/A4 title blocks, verified at 400 DPI):
 * drafting scale is 1/64" = 1'-0", i.e. 1 inch on paper = 64 real feet, and PDF
 * points are 1/72 inch, so 1 PDF point = 64/72 = 0.8888... real feet.
 *
 * Confirmed by haversine bearing calc between the two geocoded anchors
 * (Solomon's Yamacraw 25.024366,-77.2822905 and J&A Convenient Store
 * 25.025814,-77.2787072): true bearing of Yamacraw Hill Rd is 65.964deg,
 * matching the spec's 65.96deg to three decimal places.
 */

/** PDF points -> real feet, using the confirmed 1/64" = 1'-0" drafting scale. */
export const FEET_PER_PDF_POINT = 64 / 72;

/** Confirmed true compass bearing (deg from north) of the Yamacraw Hill Rd frontage. */
export const FRONTAGE_BEARING_DEG = 65.96;

/** Best current anchor: property line meets Yamacraw Hill Rd at the NW corner. */
export const NW_ANCHOR = { lat: 25.02339, lon: -77.2831 };

/** Mean earth radius in feet (matches the constant used to verify the bearing/distance above). */
const EARTH_RADIUS_FT = 20925646.3;

export interface LocalFeet {
  /** local feet, +X runs along the traced frontage-edge direction (as drawn) */
  xFt: number;
  /** local feet, +Y runs perpendicular to the frontage, into the site (as drawn) */
  yFt: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

/** Raw PDF-point coordinates (from a traced sheet) -> local feet, relative to an origin also given in PDF points. */
export function pdfPointsToLocalFeet(
  pdfX: number,
  pdfY: number,
  originPdfX: number,
  originPdfY: number
): LocalFeet {
  return {
    xFt: (pdfX - originPdfX) * FEET_PER_PDF_POINT,
    yFt: (pdfY - originPdfY) * FEET_PER_PDF_POINT,
  };
}

/**
 * Local feet -> real lat/lon. Local +X is defined to run along the frontage
 * (true bearing = bearingDeg); local +Y is perpendicular, into the site, which
 * by this site's real layout (site sits south of the road) is bearingDeg + 90.
 * If a traced batch turns out mirrored, flip perpendicularSign to -1 rather
 * than touching the bearing — verify against the real-map overlay (Section 4).
 */
export function localFeetToLatLon(
  point: LocalFeet,
  anchor: LatLon = NW_ANCHOR,
  bearingDeg: number = FRONTAGE_BEARING_DEG,
  perpendicularSign: 1 | -1 = 1
): LatLon {
  const alongRad = (bearingDeg * Math.PI) / 180;
  const perpRad = ((bearingDeg + 90 * perpendicularSign) * Math.PI) / 180;

  // true (north, east) feet offset = along-frontage component + perpendicular component
  const northFt = point.xFt * Math.cos(alongRad) + point.yFt * Math.cos(perpRad);
  const eastFt = point.xFt * Math.sin(alongRad) + point.yFt * Math.sin(perpRad);

  const distanceFt = Math.sqrt(northFt * northFt + eastFt * eastFt);
  const bearingFromAnchor = (Math.atan2(eastFt, northFt) * 180) / Math.PI;

  return destinationPoint(anchor, bearingFromAnchor, distanceFt);
}

/** Spherical "destination point given start, bearing, distance" — accurate for site-scale distances. */
export function destinationPoint(start: LatLon, bearingDeg: number, distanceFt: number): LatLon {
  const delta = distanceFt / EARTH_RADIUS_FT;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi1 = (start.lat * Math.PI) / 180;
  const lambda1 = (start.lon * Math.PI) / 180;

  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
  const lambda2 =
    lambda1 +
    Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));

  return { lat: (phi2 * 180) / Math.PI, lon: (lambda2 * 180) / Math.PI };
}

/** Convenience: raw PDF point -> real lat/lon in one call. */
export function cadPointToLatLon(
  pdfX: number,
  pdfY: number,
  originPdfX: number,
  originPdfY: number,
  anchor: LatLon = NW_ANCHOR,
  bearingDeg: number = FRONTAGE_BEARING_DEG,
  perpendicularSign: 1 | -1 = 1
): LatLon {
  const local = pdfPointsToLocalFeet(pdfX, pdfY, originPdfX, originPdfY);
  return localFeetToLatLon(local, anchor, bearingDeg, perpendicularSign);
}
