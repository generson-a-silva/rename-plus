import { AppIcon, type AppIconName } from "@components/common";
import { useI18n } from "@hooks";
import { isRootPath } from "@lib";
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
	showHidden: boolean;
	onToggleHidden: () => void;
	onOpenSettings: () => void;
	onOpenWelcome: () => void;
}

function ToolButton(props: {
	icon: AppIconName;
	label: string;
	onClick: () => void;
	disabled?: boolean;
	/** Botão de alternância: `true`/`false` indica ligado/desligado. */
	pressed?: boolean;
}) {
	return (
		<button
			type="button"
			className={`tool-button${props.pressed ? " pressed" : ""}`}
			title={props.label}
			aria-pressed={props.pressed}
			aria-label={props.label}
			disabled={props.disabled}
			onClick={props.onClick}
		>
			<AppIcon name={props.icon} />
		</button>
	);
}

/** Barra superior: navegação entre pastas, seleção em massa, itens ocultos, boas-vindas e configurações. */
export function NavigationToolbar(props: NavigationToolbarProps) {
	const { currentDir } = props;
	const { t } = useI18n();
	const [draft, setDraft] = useState(currentDir ?? "");

	useEffect(() => setDraft(currentDir ?? ""), [currentDir]);

	return (
		<header className="toolbar">
			<ToolButton
				icon="up"
				label={t("toolbar.up")}
				disabled={!currentDir || isRootPath(currentDir)}
				onClick={props.onUp}
			/>
			<ToolButton icon="home" label={t("toolbar.home")} onClick={props.onHome} />
			<ToolButton
				icon="refresh"
				label={t("toolbar.refresh")}
				disabled={!currentDir}
				onClick={props.onRefresh}
			/>
			<ToolButton icon="open" label={t("toolbar.openFolder")} onClick={props.onPickFolder} />

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
					aria-label={t("toolbar.path")}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Escape") setDraft(currentDir ?? "");
					}}
				/>
			</form>

			<div className="toolbar-group">
				<ToolButton icon="selectAll" label={t("toolbar.selectAll")} onClick={props.onSelectAll} />
				<ToolButton
					icon="selectNone"
					label={t("toolbar.selectNone")}
					onClick={props.onSelectNone}
				/>
				<ToolButton icon="invert" label={t("toolbar.invert")} onClick={props.onInvert} />
			</div>
			<div className="toolbar-group">
				<ToolButton
					icon={props.showHidden ? "eye" : "eyeOff"}
					label={t(props.showHidden ? "toolbar.hideHidden" : "toolbar.showHidden")}
					pressed={props.showHidden}
					onClick={props.onToggleHidden}
				/>
				<ToolButton icon="info" label={t("toolbar.welcome")} onClick={props.onOpenWelcome} />
				<ToolButton icon="settings" label={t("settings.button")} onClick={props.onOpenSettings} />
			</div>
		</header>
	);
}
