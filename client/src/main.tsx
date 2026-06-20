import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { hydratePersistedCache, startPersistingCache } from "./lib/query-persist";
import { initPwa } from "./lib/pwa";

// Warm the React Query cache from localStorage BEFORE first render so saved
// conversations show instantly on a cold start, then keep persisting updates.
hydratePersistedCache();
startPersistingCache();

// Register the service worker, background sync, and screenshot share/file intake.
initPwa();

createRoot(document.getElementById("root")!).render(<App />);
