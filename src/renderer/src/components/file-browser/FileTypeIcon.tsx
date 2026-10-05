import type { FileKind } from "@lib";

/** Folha com a ponta dobrada, base dos ícones de documento. */
const SHEET = "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5";

const PATHS: Record<FileKind, string> = {
	folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
	file: SHEET,
	image: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9h.01",
	video: "M3 6h13v12H3zM16 10l5-3v10l-5-3",
	audio:
		"M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
	archive: `${SHEET}M10 4h1M10 7h1M10 10h1M9.5 13h2v3h-2z`,
	pdf: `${SHEET}M9 13h6M9 17h4`,
	document: `${SHEET}M9 13h6M9 17h6M9 9h2`,
	spreadsheet: `${SHEET}M8 12h8v6H8zM8 15h8M12 12v6`,
	presentation: `${SHEET}M9 18v-3M12 18v-6M15 18v-4`,
	text: `${SHEET}M9 13h6M9 17h6`,
	code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14",
	executable: "M3 5h18v14H3zM3 9h18M7 13l2 2-2 2M11 17h4",
	font: `${SHEET}M9 18l3-7 3 7M10.3 15.5h3.4`,
};

/**
 * Ícone de um item da lista/árvore: pasta preenchida em azul, arquivos com o desenho
 * e a cor da categoria (ou o genérico, em contorno cinza, se o tipo não for reconhecido).
 */
export function FileTypeIcon({ kind, size = 16 }: { kind: FileKind; size?: number }) {
	const filled = kind === "folder";
	return (
		<svg
			className={`icon file-icon kind-${kind}`}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={filled ? "currentColor" : "none"}
			stroke="currentColor"
			strokeWidth={filled ? 1.5 : 1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d={PATHS[kind]} />
		</svg>
	);
}
