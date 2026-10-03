import type { ReactNode } from "react";
import { AppIcon } from "./AppIcon";

interface OptionPanelProps {
	number: number;
	title: string;
	active: boolean;
	className?: string;
	onReset?: () => void;
	children: ReactNode;
}

/** Caixa numerada no estilo do Bulk Rename Utility; destacada quando altera o nome. */
export function OptionPanel({
	number,
	title,
	active,
	className,
	onReset,
	children,
}: OptionPanelProps) {
	return (
		<fieldset className={`panel${active ? " active" : ""} ${className ?? ""}`}>
			<legend>
				<span className="panel-number">{number}</span>
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
