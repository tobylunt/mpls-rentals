import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "mpls-rentals.userdata";
const SEED_URL = `${import.meta.env.BASE_URL}data/seed-notes.json`;

export type Notes = Record<string, string>;
export type Ratings = Record<string, number>; // 1-5

export type TourStatus = "scheduled" | "confirmed";
export type Tour = { at?: string; status: TourStatus }; // at = ISO datetime, optional
export type Tours = Record<string, Tour>;

export type MarketStatus = "probably_rented" | "rented" | "on_hold";
export type MarketStatuses = Record<string, MarketStatus>;

// Reason is required; presence of an entry means "ruled out".
export type Disqualifications = Record<string, string>;

type Stored = {
  notes: Notes;
  ratings: Ratings;
  tours: Tours;
  marketStatuses: MarketStatuses;
  disqualifications: Disqualifications;
};

function emptyStored(): Stored {
  return { notes: {}, ratings: {}, tours: {}, marketStatuses: {}, disqualifications: {} };
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStored();
    const parsed = JSON.parse(raw);
    return {
      notes: parsed?.notes ?? {},
      ratings: parsed?.ratings ?? {},
      tours: parsed?.tours ?? {},
      marketStatuses: parsed?.marketStatuses ?? {},
      disqualifications: parsed?.disqualifications ?? {},
    };
  } catch {
    return emptyStored();
  }
}

export function useUserData() {
  const [data, setData] = useState<Stored>(() => read());
  // Track whether localStorage was empty on mount — if so, we'll seed from JSON
  // and suppress the persist effect until the seed has been resolved.
  const wasEmpty = useRef<boolean>(!localStorage.getItem(KEY));

  // Seed merge: always fetch the repo seed. If localStorage was empty, the
  // seed becomes the initial state. If localStorage exists, only NEW entries
  // (listing IDs not already in user state) for tours + marketStatuses are
  // pulled in — notes/ratings are left untouched so we don't clobber edits.
  useEffect(() => {
    let cancelled = false;
    fetch(SEED_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((seed) => {
        if (cancelled || !seed) {
          wasEmpty.current = false;
          return;
        }
        if (wasEmpty.current) {
          wasEmpty.current = false;
          setData({
            notes: seed?.notes ?? {},
            ratings: seed?.ratings ?? {},
            tours: seed?.tours ?? {},
            marketStatuses: seed?.marketStatuses ?? {},
            disqualifications: seed?.disqualifications ?? {},
          });
        } else {
          // Seed wins for tours + marketStatuses (file is the source of truth
          // until we have in-app edit UI). Notes + ratings + disqualifications
          // are user-owned and left untouched here.
          setData((prev) => ({
            ...prev,
            tours: { ...prev.tours, ...((seed?.tours ?? {}) as Tours) },
            marketStatuses: { ...prev.marketStatuses, ...((seed?.marketStatuses ?? {}) as MarketStatuses) },
          }));
        }
      })
      .catch(() => {
        wasEmpty.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Don't overwrite the on-disk seed with an empty object before it loads.
    if (wasEmpty.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* localStorage unavailable -> ignore */
    }
  }, [data]);

  const setNote = useCallback((id: string, text: string) => {
    setData((prev) => {
      const notes = { ...prev.notes };
      if (text.trim() === "") delete notes[id];
      else notes[id] = text;
      return { ...prev, notes };
    });
  }, []);

  const setRating = useCallback((id: string, rating: number | null) => {
    setData((prev) => {
      const ratings = { ...prev.ratings };
      if (rating == null || rating < 1) delete ratings[id];
      else ratings[id] = Math.max(1, Math.min(5, Math.round(rating)));
      return { ...prev, ratings };
    });
  }, []);

  const setTour = useCallback((id: string, tour: Tour | null) => {
    setData((prev) => {
      const tours = { ...prev.tours };
      if (tour == null) delete tours[id];
      else tours[id] = tour;
      return { ...prev, tours };
    });
  }, []);

  const setMarketStatus = useCallback((id: string, status: MarketStatus | null) => {
    setData((prev) => {
      const marketStatuses = { ...prev.marketStatuses };
      if (status == null) delete marketStatuses[id];
      else marketStatuses[id] = status;
      return { ...prev, marketStatuses };
    });
  }, []);

  const setDisqualification = useCallback((id: string, reason: string | null) => {
    setData((prev) => {
      const disqualifications = { ...prev.disqualifications };
      if (reason == null || reason.trim() === "") delete disqualifications[id];
      else disqualifications[id] = reason;
      return { ...prev, disqualifications };
    });
  }, []);

  const exportData = useCallback(() => {
    const payload = { exportedAt: new Date().toISOString(), ...data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mpls-rentals-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importData = useCallback(
    async (
      file: File
    ): Promise<{
      notesCount: number;
      ratingsCount: number;
      toursCount: number;
      marketStatusCount: number;
      disqualificationCount: number;
    }> => {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incomingNotes = (parsed?.notes ?? {}) as Notes;
      const incomingRatings = (parsed?.ratings ?? {}) as Ratings;
      const incomingTours = (parsed?.tours ?? {}) as Tours;
      const incomingMarket = (parsed?.marketStatuses ?? {}) as MarketStatuses;
      const incomingDq = (parsed?.disqualifications ?? {}) as Disqualifications;
      let notesCount = 0;
      let ratingsCount = 0;
      let toursCount = 0;
      let marketStatusCount = 0;
      let disqualificationCount = 0;
      setData((prev) => {
        const notes = { ...prev.notes };
        for (const [id, val] of Object.entries(incomingNotes)) {
          if (typeof val === "string" && val.trim() !== "") {
            notes[id] = val;
            notesCount++;
          }
        }
        const ratings = { ...prev.ratings };
        for (const [id, val] of Object.entries(incomingRatings)) {
          if (typeof val === "number" && val >= 1 && val <= 5) {
            ratings[id] = Math.round(val);
            ratingsCount++;
          }
        }
        const tours = { ...prev.tours };
        for (const [id, val] of Object.entries(incomingTours)) {
          if (val && (val.status === "scheduled" || val.status === "confirmed")) {
            tours[id] = val;
            toursCount++;
          }
        }
        const marketStatuses = { ...prev.marketStatuses };
        for (const [id, val] of Object.entries(incomingMarket)) {
          if (val === "probably_rented" || val === "rented" || val === "on_hold") {
            marketStatuses[id] = val;
            marketStatusCount++;
          }
        }
        const disqualifications = { ...prev.disqualifications };
        for (const [id, val] of Object.entries(incomingDq)) {
          if (typeof val === "string" && val.trim() !== "") {
            disqualifications[id] = val;
            disqualificationCount++;
          }
        }
        return { notes, ratings, tours, marketStatuses, disqualifications };
      });
      return { notesCount, ratingsCount, toursCount, marketStatusCount, disqualificationCount };
    },
    []
  );

  return {
    notes: data.notes,
    ratings: data.ratings,
    tours: data.tours,
    marketStatuses: data.marketStatuses,
    disqualifications: data.disqualifications,
    setNote,
    setRating,
    setTour,
    setMarketStatus,
    setDisqualification,
    exportData,
    importData,
  };
}
