import {
  FEET_PER_PDF_POINT,
  FRONTAGE_BEARING_DEG,
  NW_ANCHOR,
  pdfPointsToLocalFeet,
  localFeetToLatLon,
  destinationPoint,
  cadPointToLatLon,
} from '../geoTransform';

describe('geoTransform', () => {
  it('confirms the drafting scale: 1/64" = 1\'-0" => 1 pdf point = 64/72 ft', () => {
    expect(FEET_PER_PDF_POINT).toBeCloseTo(0.888889, 6);
  });

  it('confirms the measured Yamacraw Hill Rd bearing', () => {
    expect(FRONTAGE_BEARING_DEG).toBeCloseTo(65.96, 2);
  });

  it('pdfPointsToLocalFeet scales and translates relative to an origin', () => {
    const origin = { x: 1000, y: 2000 };
    const p = pdfPointsToLocalFeet(1090, 2000, origin.x, origin.y);
    expect(p.xFt).toBeCloseTo(90 * FEET_PER_PDF_POINT, 6);
    expect(p.yFt).toBeCloseTo(0, 6);
  });

  it('the origin (0,0 local feet) maps back to the anchor exactly', () => {
    const result = localFeetToLatLon({ xFt: 0, yFt: 0 });
    expect(result.lat).toBeCloseTo(NW_ANCHOR.lat, 9);
    expect(result.lon).toBeCloseTo(NW_ANCHOR.lon, 9);
  });

  it('a point purely along local +X lands at the frontage bearing, at the right distance', () => {
    const distanceFt = 500;
    const result = localFeetToLatLon({ xFt: distanceFt, yFt: 0 });
    const straightLine = destinationPoint(NW_ANCHOR, FRONTAGE_BEARING_DEG, distanceFt);
    expect(result.lat).toBeCloseTo(straightLine.lat, 9);
    expect(result.lon).toBeCloseTo(straightLine.lon, 9);
  });

  it('a point purely along local +Y (perpendicular) lands 90 degrees off the frontage bearing', () => {
    const distanceFt = 300;
    const result = localFeetToLatLon({ xFt: 0, yFt: distanceFt });
    const perpendicular = destinationPoint(NW_ANCHOR, FRONTAGE_BEARING_DEG + 90, distanceFt);
    expect(result.lat).toBeCloseTo(perpendicular.lat, 9);
    expect(result.lon).toBeCloseTo(perpendicular.lon, 9);
  });

  it('flipping perpendicularSign mirrors the perpendicular component', () => {
    const distanceFt = 300;
    const positive = localFeetToLatLon({ xFt: 0, yFt: distanceFt }, NW_ANCHOR, FRONTAGE_BEARING_DEG, 1);
    const negative = localFeetToLatLon({ xFt: 0, yFt: distanceFt }, NW_ANCHOR, FRONTAGE_BEARING_DEG, -1);
    expect(positive.lat).not.toBeCloseTo(negative.lat, 6);
  });

  it('destinationPoint round-trips a known bearing/distance sensibly (stays near the anchor for small distances)', () => {
    const result = destinationPoint(NW_ANCHOR, 90, 100);
    expect(result.lat).toBeCloseTo(NW_ANCHOR.lat, 3);
    expect(result.lon).toBeGreaterThan(NW_ANCHOR.lon);
  });

  it('cadPointToLatLon composes the full pipeline from raw pdf points', () => {
    const originPdf = { x: 500, y: 500 };
    const result = cadPointToLatLon(500, 500, originPdf.x, originPdf.y);
    expect(result.lat).toBeCloseTo(NW_ANCHOR.lat, 9);
    expect(result.lon).toBeCloseTo(NW_ANCHOR.lon, 9);
  });
});
