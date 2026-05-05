import { useEffect, useState } from "react";

const KEY = "mpls-rentals.shortlist";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useShortlist() {
  const [ids, setIds] = useState<Set<string>>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...ids]));
    } catch {
      /* localStorage unavailable -> ignore */
    }
  }, [ids]);

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { ids, toggle };
}
