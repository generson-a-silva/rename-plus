import type { Locale } from "@shared/i18n";
import type { ReactNode } from "react";

const FLAG_WIDTH = 20;
const FLAG_HEIGHT = 14;
const US_STRIPE = FLAG_HEIGHT / 13;

/** Desenhos simplificados, na proporção 20×14. */
const FLAGS: Record<Locale, ReactNode> = {
	"pt-BR": (
		<>
			<rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill="#009c3b" />
			<path d="M10 1.8 18 7l-8 5.2L2 7z" fill="#ffdf00" />
			<circle cx="10" cy="7" r="3" fill="#002776" />
		</>
	),
	en: (
		<>
			<rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill="#fff" />
			{[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
				<rect
					key={stripe}
					y={stripe * US_STRIPE}
					width={FLAG_WIDTH}
					height={US_STRIPE}
					fill="#b22234"
				/>
			))}
			<rect width="9" height={7 * US_STRIPE} fill="#3c3b6e" />
			<path
				d="M1.5 1.7h1M4 1.7h1M6.5 1.7h1M2.7 3.7h1M5.2 3.7h1M1.5 5.7h1M4 5.7h1M6.5 5.7h1"
				stroke="#fff"
				strokeWidth="1"
			/>
		</>
	),
	es: (
		<>
			<rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill="#aa151b" />
			<rect y="3.5" width={FLAG_WIDTH} height="7" fill="#f1bf00" />
		</>
	),
};

interface LocaleFlagProps {
	locale: Locale;
	/** Largura em pixels; a altura segue a proporção. */
	size?: number;
}

/**
 * Bandeira de um idioma. É desenhada em SVG porque os emojis de bandeira não aparecem
 * no Windows (viram as letras do país). Decorativa: o nome do idioma vem ao lado.
 */
export function LocaleFlag({ locale, size = 18 }: LocaleFlagProps) {
	const clipId = `flag-clip-${locale}`;
	return (
		<svg
			className="locale-flag"
			width={size}
			height={(size * FLAG_HEIGHT) / FLAG_WIDTH}
			viewBox={`0 0 ${FLAG_WIDTH} ${FLAG_HEIGHT}`}
			aria-hidden="true"
		>
			<clipPath id={clipId}>
				<rect width={FLAG_WIDTH} height={FLAG_HEIGHT} rx="2" />
			</clipPath>
			<g clipPath={`url(#${clipId})`}>{FLAGS[locale]}</g>
		</svg>
	);
}
