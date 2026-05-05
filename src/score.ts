const DRIVE_MIN_PER_KM = 2.5;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

type Pt = { lat: number | null; lng: number | null };

export type ChainInputs = {
  homeToSchoolDriveMin: number | null;
  homeLat?: number | null;
  homeLng?: number | null;
  school: Pt;
  daycare: Pt;
};

function isFull(p: Pt): p is { lat: number; lng: number } {
  return p.lat != null && p.lng != null;
}

function driveMinBetween(a: Pt, b: Pt): number | null {
  if (!isFull(a) || !isFull(b)) return null;
  return haversineKm(a.lat, a.lng, b.lat, b.lng) * DRIVE_MIN_PER_KM;
}

// Models the morning routine: home → school → daycare. Work is intentionally
// excluded — work commute is shown separately and shouldn't dominate the
// "school+daycare bunching" signal this metric is meant to surface.
export function chainTimeMin(input: ChainInputs): number | null {
  if (!isFull(input.school) || !isFull(input.daycare)) return null;

  let homeToSchool = input.homeToSchoolDriveMin;
  if (homeToSchool == null) {
    const home: Pt = { lat: input.homeLat ?? null, lng: input.homeLng ?? null };
    homeToSchool = driveMinBetween(home, input.school);
    if (homeToSchool == null) return null;
  }

  const schoolToDaycare = driveMinBetween(input.school, input.daycare)!;

  return homeToSchool + schoolToDaycare;
}
