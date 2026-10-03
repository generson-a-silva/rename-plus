import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RenamePlusApp } from "./RenamePlusApp";
import "./appStyles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento #root não encontrado.");

createRoot(rootElement).render(
	<StrictMode>
		<RenamePlusApp />
	</StrictMode>,
);
