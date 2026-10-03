import type { ReactNode } from "react";
import { AppIcon } from "./AppIcon";

interface OptionPanelProps {
	title: string;
	active: boolean;
	className?: string;
	onReset?: () => void;
	children: ReactNode;
}

/** Caixa de opções com o título em badge; destacada quando a seção altera o nome. */
export function OptionPanel({ title, active, className, onReset, children }: OptionPanelProps) {
	return (
		<fieldset className={`panel${active ? " active" : ""} ${className ?? ""}`}>
			<legend className="panel-badge">
				{title}
				{onReset && active && (
					<button type="button" className="panel-reset" title="Redefinir seção" onClick={onReset}>
						<AppIcon name="reset" size={12} />
					</button>
				)}
			</legend>
			<div className="panel-body">{children}</div>
		</fieldset>
	);
}
