import { useMemo, useRef, useState } from "react";
import { Map } from "./components/Map";
import { FilterBar, applyFilters, defaultFilters, type Filters } from "./components/FilterBar";
import { ListingList, type SortKey } from "./components/ListingList";
import { CompareView } from "./components/CompareView";
import { ItineraryPanel } from "./components/Itinerary";
import { data } from "./data";
import { useUserData } from "./userdata";

export default function App() {
  const {
    notes,
    ratings,
    tours,
    marketStatuses,
    disqualifications,
    shortlist: shortlistArr,
    itineraries,
    setNote,
    setRating,
    setDisqualification,
    toggleShortlist,
    exportData,
    importData,
  } = useUserData();
  const shortlist = useMemo(() => new Set(shortlistArr), [shortlistArr]);
  // Bumped each time the itinerary panel asks the map to fly somewhere.
  // The `key` field forces FlyToPoint's effect to re-run even if the same
  // coords are clicked twice.
  const [flyToPoint, setFlyToPoint] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const flyKey = useRef(0);
  function flyTo(lat: number, lng: number) {
    flyKey.current += 1;
    setFlyToPoint({ lat, lng, key: flyKey.current });
  }
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(data.listings));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("chain");
  const [view, setView] = useState<"map" | "compare">("map");
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { notesCount, ratingsCount, toursCount, marketStatusCount, disqualificationCount, shortlistCount } = await importData(file);
      alert(
        `Imported ${notesCount} note(s), ${ratingsCount} rating(s), ${toursCount} tour(s), ${marketStatusCount} market-status flag(s), ${disqualificationCount} disqualification(s), ${shortlistCount} new shortlist starring(s).`
      );
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    e.target.value = ""; // allow re-importing same file
  }

  const visible = useMemo(
    () => applyFilters(data.listings, filters, shortlist, disqualifications),
    [filters, shortlist, disqualifications]
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
        <div className="topbar__actions">
          <button className="tab" onClick={exportData} title="Download notes + ratings as JSON">
            Export notes
          </button>
          <button className="tab" onClick={() => importInputRef.current?.click()} title="Load notes + ratings from a JSON file">
            Import
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            style={{ display: "none" }}
          />
        </div>
        <span className="topbar__count">{visible.length} of {data.listings.length}</span>
      </header>
      <main className="main">
        {view === "map" ? (
          <>
            <aside className="rail">
              <FilterBar listings={data.listings} filters={filters} setFilters={setFilters} />
              {Object.entries(itineraries).map(([key, itin]) => (
                <ItineraryPanel
                  key={key}
                  itinerary={itin}
                  listings={data.listings}
                  schools={data.schools}
                  onFlyTo={flyTo}
                />
              ))}
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
                notes={notes}
                ratings={ratings}
                tours={tours}
                marketStatuses={marketStatuses}
                disqualifications={disqualifications}
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
                notes={notes}
                ratings={ratings}
                disqualifications={disqualifications}
                tours={tours}
                marketStatuses={marketStatuses}
                flyToPoint={flyToPoint}
                setNote={setNote}
                setRating={setRating}
                setDisqualification={setDisqualification}
              />
            </section>
          </>
        ) : (
          <CompareView
            listings={shortlisted}
            schools={data.schools}
            daycares={data.daycares}
            notes={notes}
            ratings={ratings}
            tours={tours}
            marketStatuses={marketStatuses}
            disqualifications={disqualifications}
            onClose={() => setView("map")}
          />
        )}
      </main>
    </div>
  );
}
