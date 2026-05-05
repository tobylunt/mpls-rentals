import { describe, it, expect } from "vitest";
import { haversineKm, chainTimeMin, type ChainInputs } from "./score";

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(44.9, -93.3, 44.9, -93.3)).toBeCloseTo(0, 5);
  });

  it("returns ~111 km for 1 degree of latitude", () => {
    expect(haversineKm(44.0, -93.0, 45.0, -93.0)).toBeCloseTo(111, 0);
  });
});

describe("chainTimeMin", () => {
  // Setup: home is 5 min drive from school. School and daycare are at the same
  // point (school === daycare coords) so middle term is ~0. Daycare to work is
  // a known 1-degree-lat distance => ~111 km => ~277 min at 2.5 min/km.
  const colocated: ChainInputs = {
    homeToSchoolDriveMin: 5,
    school: { lat: 44.9, lng: -93.3 },
    daycare: { lat: 44.9, lng: -93.3 },
    work: { lat: 45.9, lng: -93.3 },
  };

  it("computes the chain when school and daycare overlap", () => {
    // home->school: 5  +  school->daycare: ~0  +  daycare->work: ~277  =  ~282
    expect(chainTimeMin(colocated)).toBeCloseTo(5 + 0 + 111 * 2.5, 0);
  });

  it("penalizes school and daycare being far apart", () => {
    const apart: ChainInputs = {
      ...colocated,
      daycare: { lat: 44.9, lng: -92.3 }, // ~80 km east of school
    };
    const close = chainTimeMin(colocated)!;
    const far = chainTimeMin(apart)!;
    expect(far).toBeGreaterThan(close);
  });

  it("returns null if school coords missing", () => {
    expect(chainTimeMin({ ...colocated, school: { lat: null, lng: null } })).toBeNull();
  });

  it("returns null if home->school drive is unknown and home coords missing too", () => {
    expect(
      chainTimeMin({
        homeToSchoolDriveMin: null,
        homeLat: null,
        homeLng: null,
        school: { lat: 44.9, lng: -93.3 },
        daycare: { lat: 44.9, lng: -93.3 },
        work: { lat: 45.0, lng: -93.3 },
      })
    ).toBeNull();
  });

  it("falls back to straight-line for home->school when drive minutes missing", () => {
    const result = chainTimeMin({
      homeToSchoolDriveMin: null,
      homeLat: 44.9,
      homeLng: -93.3,
      school: { lat: 44.9, lng: -93.3 }, // home == school
      daycare: { lat: 44.9, lng: -93.3 },
      work: { lat: 44.9, lng: -93.3 },
    });
    expect(result).toBeCloseTo(0, 0);
  });
});
