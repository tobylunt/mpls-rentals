import { useMemo, useState } from "react";
import { Map } from "./components/Map";
import { FilterBar, applyFilters, defaultFilters, type Filters } from "./components/FilterBar";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist } = useShortlist();
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(data.listings));

  const visible = useMemo(
    () => applyFilters(data.listings, filters, shortlist),
    [filters, shortlist]
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
        <span className="topbar__count">{visible.length} of {data.listings.length}</span>
      </header>
      <main className="main">
        <aside className="rail">
          <FilterBar listings={data.listings} filters={filters} setFilters={setFilters} />
        </aside>
        <section className="map-area">
          <Map
            listings={visible}
            shortlist={shortlist}
            schools={data.schools}
            daycares={data.daycares}
            work={data.work}
          />
        </section>
      </main>
    </div>
  );
}
