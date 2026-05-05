import raw from "../public/data/listings.json";

export type Distance = {
  walk_min: number | null;
  drive_min: number | null;
  raw: string;
};

export type Listing = {
  id: string;
  lodging: string;
  address: string;
  url: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  bedrooms: number | null;
  housing_type: string | null;
  neighborhood: string | null;
  price: number | null;
  pet_rent: number | "unknown" | null;
  furnished: boolean | null;
  parking: string | null;
  size_sqft: number | null;
  price_per_sqft: number | null;
  available: string;
  term: string | null;
  school: string | null;
  daycare: string | null;
  dist_school: Distance;
  dist_daycare: Distance;
  dist_work_drive_min: number | null;
  utilities: string | null;
  notes: string | null;
};

export type Place = { name: string; query: string; lat: number | null; lng: number | null };

export type DataFile = {
  listings: Listing[];
  schools: Place[];
  daycares: Place[];
  work: Place;
};

export const data: DataFile = raw as DataFile;
