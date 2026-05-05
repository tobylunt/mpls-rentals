import { Map } from "./components/Map";
import { data } from "./data";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
      </header>
      <main className="main">
        <Map listings={data.listings} />
      </main>
    </div>
  );
}
