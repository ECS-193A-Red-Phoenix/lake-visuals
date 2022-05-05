import { Link } from "react-router-dom";

import "./css/App.css";
import "./css/reset.css";

function App() {
  return (
    <div className="App">
      <h1> Lake Tahoe Visualizations</h1>
      <span>
        This website is simply a proxy our for React Native App visualizations.
        Since React Native doesn't have a fast, well supported API for bespoke
        visualizations, our solution to insert a WebView with this website
        embedded inside.
      </span>
      <span>
        <Link to="/temperature"> Click here to go to temperature </Link>
      </span>
      <span>
        <Link to="/flow"> Click here to go to flow </Link>
      </span>
      <span>
        <Link to="/realtime"> Click here to go to realtime </Link>
      </span>
    </div>
  );
}

export default App;
