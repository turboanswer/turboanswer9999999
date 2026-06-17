import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { hydratePersistedCache, startPersistingCache } from "./lib/query-persist";

// Warm the React Query cache from localStorage BEFORE first render so saved
// conversations show instantly on a cold start, then keep persisting updates.
hydratePersistedCache();
startPersistingCache();

createRoot(document.getElementById("root")!).render(<App />);
