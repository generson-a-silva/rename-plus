import { I18nProvider } from "@components";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RenamePlusApp } from "./RenamePlusApp";
import "./appStyles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found");

createRoot(rootElement).render(
	<StrictMode>
		<I18nProvider>
			<RenamePlusApp />
		</I18nProvider>
	</StrictMode>,
);
