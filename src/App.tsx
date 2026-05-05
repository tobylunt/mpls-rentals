import { Map } from "./components/Map";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist } = useShortlist();

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
      </header>
      <main className="main">
        <Map
          listings={data.listings}
          shortlist={shortlist}
          schools={data.schools}
          daycares={data.daycares}
          work={data.work}
        />
      </main>
    </div>
  );
}
