import { useMemo, useState } from "react";
import { Map } from "./components/Map";
import { FilterBar, applyFilters, defaultFilters, type Filters } from "./components/FilterBar";
import { ListingList, type SortKey } from "./components/ListingList";
import { CompareView } from "./components/CompareView";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist, toggle: toggleShortlist } = useShortlist();
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(data.listings));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("chain");
  const [view, setView] = useState<"map" | "compare">("map");

  const visible = useMemo(
    () => applyFilters(data.listings, filters, shortlist),
    [filters, shortlist]
  );
  const shortlisted = useMemo(
    () => data.listings.filter((l) => shortlist.has(l.id)),
    [shortlist]
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
        <div className="topbar__tabs">
          <button
            className={view === "map" ? "tab tab--on" : "tab"}
            onClick={() => setView("map")}
          >
            Map
          </button>
          <button
            className={view === "compare" ? "tab tab--on" : "tab"}
            onClick={() => setView("compare")}
          >
            Compare shortlist ({shortlist.size})
          </button>
        </div>
        <span className="topbar__count">{visible.length} of {data.listings.length}</span>
      </header>
      <main className="main">
        {view === "map" ? (
          <>
            <aside className="rail">
              <FilterBar listings={data.listings} filters={filters} setFilters={setFilters} />
              <ListingList
                listings={visible}
                shortlist={shortlist}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleStar={toggleShortlist}
                sortKey={sortKey}
                setSortKey={setSortKey}
                schools={data.schools}
                daycares={data.daycares}
                work={data.work}
              />
            </aside>
            <section className="map-area">
              <Map
                listings={visible}
                shortlist={shortlist}
                schools={data.schools}
                daycares={data.daycares}
                work={data.work}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleStar={toggleShortlist}
              />
            </section>
          </>
        ) : (
          <CompareView
            listings={shortlisted}
            schools={data.schools}
            daycares={data.daycares}
            work={data.work}
            onClose={() => setView("map")}
          />
        )}
      </main>
    </div>
  );
}
