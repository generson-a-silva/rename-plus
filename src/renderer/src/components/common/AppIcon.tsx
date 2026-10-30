import { type AppIconName, ICON_PATHS } from "@lib";

export type { AppIconName };

/** Ícones de traço simples desenhados em SVG, herdando a cor do texto. */
export function AppIcon({ name, size = 16 }: { name: AppIconName; size?: number }) {
	return (
		<svg
			className="icon"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d={ICON_PATHS[name]} />
		</svg>
	);
}
