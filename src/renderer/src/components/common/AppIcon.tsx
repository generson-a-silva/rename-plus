const PATHS = {
	chevron: "M9 6l6 6-6 6",
	folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
	file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
	home: "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10",
	drive: "M3 13h18M5 13l2-7h10l2 7v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM16 16h.01",
	up: "M12 19V5M5 12l7-7 7 7",
	refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
	open: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1M3 7v10a2 2 0 0 0 2 2h12l4-8H8l-3 8",
	undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
	reset: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
	rename: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
	selectAll: "M4 4h16v16H4zM8 12l3 3 5-6",
	selectNone: "M4 4h16v16H4z",
	invert: "M4 4h16v16H4zM4 20L20 4",
	sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
	moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
	monitor: "M3 5h18v11H3zM8 20h8M12 16v4",
	globe:
		"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9",
	check: "M5 12l5 5L20 7",
	chevronUp: "M6 15l6-6 6 6",
	settings: "M4 6h9M17 6h3M15 4v4M4 12h3M11 12h9M9 10v4M4 18h11M19 18h1M17 16v4",
	alert: "M12 3l9.5 17h-19zM12 10v4M12 17h.01",
	close: "M6 6l12 12M18 6L6 18",
	menu: "M4 4h16v16H4zM8 9h8M8 12h8M8 15h5",
	eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
	eyeOff:
		"M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
	download: "M12 4v11M7 10l5 5 5-5M5 20h14",
} as const;

export type AppIconName = keyof typeof PATHS;

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
			<path d={PATHS[name]} />
		</svg>
	);
}
