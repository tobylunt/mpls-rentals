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

// List of starred listing IDs.
export type Shortlist = string[];

// Heuristics: scan a free-text note for evidence of outreach.
const REACHED_OUT_RE = /\b(tour\s*request|request\s*sent|tour\s*pending|reached?\s*out|in\s*convo|scheduling|inquiry|message?\s*sent|in\s*touch|asked\s*about)\b/i;

/**
 * Derive a compact, human-readable status summary for a listing from its
 * source data + the user's overlay state. Used in map-pin tooltips and
 * card hover titles.
 *
 * Priority (first match wins):
 *  1. Off market (listings.json status === removed, or user marketStatus = rented)
 *  2. Disqualified
 *  3. Tour confirmed / scheduled (date if known)
 *  4. On hold (application pending)
 *  5. Likely rented
 *  6. Reached out (heuristic from note text)
 *  7. null (no contact yet)
 */
export function statusLabel(
  listingId: string,
  listingStatus: string | undefined,
  tours: Tours,
  marketStatuses: MarketStatuses,
  disqualifications: Disqualifications,
  notes: Notes
): string | null {
  if (listingStatus === "removed" || marketStatuses[listingId] === "rented") {
    return "Off market";
  }
  if (disqualifications[listingId]) {
    return `👎 ${disqualifications[listingId]}`;
  }
  const tour = tours[listingId];
  if (tour) {
    let when = "";
    if (tour.at) {
      const d = new Date(tour.at);
      const day = d.toLocaleDateString("en-US", { weekday: "short" });
      const time = d
        .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        .replace(/\s/g, "")
        .toLowerCase();
      when = ` ${day} ${time}`;
    }
    return tour.status === "confirmed" ? `Tour confirmed${when}` : `Tour pending${when}`;
  }
  const ms = marketStatuses[listingId];
  if (ms === "on_hold") return "On hold (application pending)";
  if (ms === "probably_rented") return "Likely rented";
  const note = notes[listingId];
  if (note && REACHED_OUT_RE.test(note)) return "Reached out";
  return null;
}

type Stored = {
  notes: Notes;
  ratings: Ratings;
  tours: Tours;
  marketStatuses: MarketStatuses;
  disqualifications: Disqualifications;
  shortlist: Shortlist;
};

function emptyStored(): Stored {
  return { notes: {}, ratings: {}, tours: {}, marketStatuses: {}, disqualifications: {}, shortlist: [] };
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    // One-time migration: if the legacy shortlist key exists in localStorage,
    // pull it in. Lets users coming from the old useShortlist hook keep their
    // stars.
    const legacyShortlist = (() => {
      try {
        const ls = localStorage.getItem("mpls-rentals.shortlist");
        return ls ? (JSON.parse(ls) as string[]) : [];
      } catch {
        return [];
      }
    })();
    if (!raw) return { ...emptyStored(), shortlist: legacyShortlist };
    const parsed = JSON.parse(raw);
    const stored: Stored = {
      notes: parsed?.notes ?? {},
      ratings: parsed?.ratings ?? {},
      tours: parsed?.tours ?? {},
      marketStatuses: parsed?.marketStatuses ?? {},
      disqualifications: parsed?.disqualifications ?? {},
      shortlist: parsed?.shortlist ?? [],
    };
    // Merge legacy in if userdata shortlist is empty
    if (stored.shortlist.length === 0 && legacyShortlist.length > 0) {
      stored.shortlist = legacyShortlist;
    }
    return stored;
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
        const seedShortlist = (seed?.shortlist ?? []) as Shortlist;
        if (wasEmpty.current) {
          wasEmpty.current = false;
          setData((prev) => ({
            notes: seed?.notes ?? {},
            ratings: seed?.ratings ?? {},
            tours: seed?.tours ?? {},
            marketStatuses: seed?.marketStatuses ?? {},
            disqualifications: seed?.disqualifications ?? {},
            // If localStorage had a legacy shortlist, prefer it; otherwise
            // use the seed's.
            shortlist: prev.shortlist.length > 0 ? prev.shortlist : seedShortlist,
          }));
        } else {
          // Merge semantics by field:
          // - tours + marketStatuses: REPLACE entirely with seed (seed is
          //   authoritative — no in-app UI to edit them, so a removal in
          //   the seed should actually remove locally).
          // - notes / ratings / disqualifications: union, seed wins on
          //   conflict (preserves any local in-app additions for keys not
          //   yet in seed).
          // - shortlist: union (additive — un-starring locally won't be
          //   undone by seed, but new seed stars do appear).
          setData((prev) => ({
            notes: { ...prev.notes, ...((seed?.notes ?? {}) as Notes) },
            ratings: { ...prev.ratings, ...((seed?.ratings ?? {}) as Ratings) },
            tours: (seed?.tours ?? {}) as Tours,
            marketStatuses: (seed?.marketStatuses ?? {}) as MarketStatuses,
            disqualifications: { ...prev.disqualifications, ...((seed?.disqualifications ?? {}) as Disqualifications) },
            shortlist: [...new Set([...prev.shortlist, ...seedShortlist])],
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

  const toggleShortlist = useCallback((id: string) => {
    setData((prev) => {
      const set = new Set(prev.shortlist);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, shortlist: [...set] };
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
      shortlistCount: number;
    }> => {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incomingNotes = (parsed?.notes ?? {}) as Notes;
      const incomingRatings = (parsed?.ratings ?? {}) as Ratings;
      const incomingTours = (parsed?.tours ?? {}) as Tours;
      const incomingMarket = (parsed?.marketStatuses ?? {}) as MarketStatuses;
      const incomingDq = (parsed?.disqualifications ?? {}) as Disqualifications;
      const incomingShortlist = (parsed?.shortlist ?? []) as Shortlist;
      let notesCount = 0;
      let ratingsCount = 0;
      let toursCount = 0;
      let marketStatusCount = 0;
      let disqualificationCount = 0;
      let shortlistCount = 0;
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
        const shortlistSet = new Set(prev.shortlist);
        for (const id of incomingShortlist) {
          if (typeof id === "string" && !shortlistSet.has(id)) {
            shortlistSet.add(id);
            shortlistCount++;
          }
        }
        return { notes, ratings, tours, marketStatuses, disqualifications, shortlist: [...shortlistSet] };
      });
      return { notesCount, ratingsCount, toursCount, marketStatusCount, disqualificationCount, shortlistCount };
    },
    []
  );

  return {
    notes: data.notes,
    ratings: data.ratings,
    tours: data.tours,
    marketStatuses: data.marketStatuses,
    disqualifications: data.disqualifications,
    shortlist: data.shortlist,
    setNote,
    setRating,
    setTour,
    setMarketStatus,
    setDisqualification,
    toggleShortlist,
    exportData,
    importData,
  };
}
