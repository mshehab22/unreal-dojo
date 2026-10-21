// Renderer entry: mounts the React app into the page.
// Loads React Fast Refresh as a module in dev, because the CSP blocks the inline script Vite would otherwise use. Empty in production.
import "@vitejs/plugin-react/preamble";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("The #root element is missing from index.html.");

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
