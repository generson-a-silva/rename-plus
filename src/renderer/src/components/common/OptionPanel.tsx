import { useI18n } from "@hooks";
import type { ReactNode } from "react";
import { AppIcon } from "./AppIcon";

interface OptionPanelProps {
	title: string;
	active: boolean;
	/** Desmarcada, a seção fica esmaecida e não é aplicada. Padrão: marcada. */
	enabled?: boolean;
	/** Mostra a caixa de seleção no badge enquanto a seção estiver ativa. */
	onToggle?: (enabled: boolean) => void;
	className?: string;
	onReset?: () => void;
	children: ReactNode;
}

/**
 * Caixa de opções com o título em badge; destacada quando a seção altera o nome.
 * Com `onToggle`, a seção ativa ganha uma caixa de seleção para ligá-la e desligá-la.
 */
export function OptionPanel({
	title,
	active,
	enabled = true,
	onToggle,
	className,
	onReset,
	children,
}: OptionPanelProps) {
	const { t } = useI18n();
	const state = active ? (enabled ? " active" : " active disabled") : "";
	return (
		<fieldset className={`panel${state} ${className ?? ""}`}>
			<legend className="panel-badge">
				{onToggle && active ? (
					<label className="panel-toggle" title={t("panel.toggle")}>
						<input
							type="checkbox"
							className="panel-toggle-check"
							checked={enabled}
							onChange={(event) => onToggle(event.target.checked)}
						/>
						{title}
					</label>
				) : (
					title
				)}
				{onReset && active && (
					<button type="button" className="panel-reset" title={t("panel.reset")} onClick={onReset}>
						<AppIcon name="reset" size={12} />
					</button>
				)}
			</legend>
			<div className="panel-body">{children}</div>
		</fieldset>
	);
}
