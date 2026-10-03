import { AppIcon, type AppIconName } from "@components/common";
import { type ReactNode, useId } from "react";

interface SettingsSectionProps {
	icon: AppIconName;
	title: string;
	description?: ReactNode;
	children: ReactNode;
}

/** Seção do modal de configurações: ícone, título e descrição, seguidos do conteúdo. */
export function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
	const titleId = useId();
	return (
		<section className="settings-section" aria-labelledby={titleId}>
			<header className="settings-section-header">
				<span className="settings-section-icon">
					<AppIcon name={icon} />
				</span>
				<div>
					<h3 id={titleId}>{title}</h3>
					{description && <div className="settings-section-description">{description}</div>}
				</div>
			</header>
			<div className="settings-section-body">{children}</div>
		</section>
	);
}

interface SettingsSubsectionProps {
	title: string;
	/** Quantidade de itens, exibida ao lado do título (a gaveta começa fechada). */
	count?: number;
	description?: string;
	children: ReactNode;
}

/**
 * Subdivisão em gaveta dentro de uma seção (ex.: gerenciadores de arquivos não
 * encontrados): fechada por padrão, abre ao clicar no título.
 */
export function SettingsSubsection({
	title,
	count,
	description,
	children,
}: SettingsSubsectionProps) {
	return (
		<details className="settings-subsection">
			<summary>
				<AppIcon name="chevron" size={14} />
				<span className="settings-subsection-title">{title}</span>
				{count !== undefined && <span className="settings-subsection-count">{count}</span>}
			</summary>
			<div className="settings-subsection-body">
				{description && <p className="settings-subsection-description">{description}</p>}
				{children}
			</div>
		</details>
	);
}
