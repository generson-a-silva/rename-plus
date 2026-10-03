import { AppIcon, type AppIconName } from "@components/common";
import { isRootPath } from "@lib";
import type { ThemeMode } from "@shared/ipc";
import { useEffect, useState } from "react";

interface NavigationToolbarProps {
	currentDir: string | null;
	onNavigate: (path: string) => void;
	onUp: () => void;
	onHome: () => void;
	onRefresh: () => void;
	onPickFolder: () => void;
	onSelectAll: () => void;
	onSelectNone: () => void;
	onInvert: () => void;
	theme: ThemeMode;
	onCycleTheme: () => void;
}

const THEME_BUTTON: Record<ThemeMode, { icon: AppIconName; label: string }> = {
	system: { icon: "monitor", label: "Tema: sistema (clique para claro)" },
	light: { icon: "sun", label: "Tema: claro (clique para escuro)" },
	dark: { icon: "moon", label: "Tema: escuro (clique para seguir o sistema)" },
};

function ToolButton(props: {
	icon: AppIconName;
	label: string;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			className="tool-button"
			title={props.label}
			aria-label={props.label}
			disabled={props.disabled}
			onClick={props.onClick}
		>
			<AppIcon name={props.icon} />
		</button>
	);
}

/** Barra superior: navegação entre pastas, seleção em massa e tema. */
export function NavigationToolbar(props: NavigationToolbarProps) {
	const { currentDir } = props;
	const [draft, setDraft] = useState(currentDir ?? "");

	useEffect(() => setDraft(currentDir ?? ""), [currentDir]);

	return (
		<header className="toolbar">
			<ToolButton
				icon="up"
				label="Pasta acima"
				disabled={!currentDir || isRootPath(currentDir)}
				onClick={props.onUp}
			/>
			<ToolButton icon="home" label="Pasta pessoal" onClick={props.onHome} />
			<ToolButton
				icon="refresh"
				label="Atualizar (F5)"
				disabled={!currentDir}
				onClick={props.onRefresh}
			/>
			<ToolButton icon="open" label="Abrir pasta…" onClick={props.onPickFolder} />

			<form
				className="path-form"
				onSubmit={(event) => {
					event.preventDefault();
					const path = draft.trim();
					if (path) props.onNavigate(path);
				}}
			>
				<input
					className="path-input mono"
					value={draft}
					spellCheck={false}
					aria-label="Caminho da pasta"
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Escape") setDraft(currentDir ?? "");
					}}
				/>
			</form>

			<div className="toolbar-group">
				<ToolButton icon="selectAll" label="Selecionar tudo (Ctrl+A)" onClick={props.onSelectAll} />
				<ToolButton icon="selectNone" label="Limpar seleção (Esc)" onClick={props.onSelectNone} />
				<ToolButton icon="invert" label="Inverter seleção" onClick={props.onInvert} />
			</div>
			<div className="toolbar-group">
				<ToolButton {...THEME_BUTTON[props.theme]} onClick={props.onCycleTheme} />
			</div>
		</header>
	);
}
