import { useCallback, useEffect, useState } from "react";

const KEY = "mpls-rentals.userdata";

export type Notes = Record<string, string>;
export type Ratings = Record<string, number>; // 1-5

type Stored = { notes: Notes; ratings: Ratings };

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { notes: {}, ratings: {} };
    const parsed = JSON.parse(raw);
    return {
      notes: parsed?.notes ?? {},
      ratings: parsed?.ratings ?? {},
    };
  } catch {
    return { notes: {}, ratings: {} };
  }
}

export function useUserData() {
  const [data, setData] = useState<Stored>(() => read());

  useEffect(() => {
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
    async (file: File): Promise<{ notesCount: number; ratingsCount: number }> => {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incomingNotes: unknown = parsed?.notes ?? {};
      const incomingRatings: unknown = parsed?.ratings ?? {};
      if (typeof incomingNotes !== "object" || typeof incomingRatings !== "object") {
        throw new Error("Invalid notes file: expected { notes: {...}, ratings: {...} }");
      }
      let notesCount = 0;
      let ratingsCount = 0;
      setData((prev) => {
        const notes = { ...prev.notes };
        for (const [id, val] of Object.entries(incomingNotes as Notes)) {
          if (typeof val === "string" && val.trim() !== "") {
            notes[id] = val;
            notesCount++;
          }
        }
        const ratings = { ...prev.ratings };
        for (const [id, val] of Object.entries(incomingRatings as Ratings)) {
          if (typeof val === "number" && val >= 1 && val <= 5) {
            ratings[id] = Math.round(val);
            ratingsCount++;
          }
        }
        return { notes, ratings };
      });
      return { notesCount, ratingsCount };
    },
    []
  );

  return { notes: data.notes, ratings: data.ratings, setNote, setRating, exportData, importData };
}
