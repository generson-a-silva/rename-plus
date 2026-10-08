import { AppIcon, type AppIconName, ThemeModeSelector } from "@components/common";
import { useI18n } from "@hooks";
import {
	LOCALE_NATIVE_NAMES,
	LOCALE_SHORT_NAMES,
	LOCALES,
	type Locale,
	type MessageKey,
} from "@shared/i18n";
import type { ThemeMode } from "@shared/ipc";
import { GITHUB_REPOSITORY } from "@shared/updates";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import paypalQrCode from "../../assets/paypal-donate-qr.png";

const REDDIT_URL = "https://www.reddit.com/r/RenamePlus/";
const PAYPAL_DONATE_URL =
	"https://www.paypal.com/donate/?business=TGA4C6HKXJ2XQ&no_recurring=0&currency_code=BRL";
const GITHUB_URL = `https://github.com/${GITHUB_REPOSITORY}`;

/**
 * Animações de cada recurso, gravadas em cada idioma (`assets/welcome/<idioma>/<slide>.webp`)
 * por `scripts/welcome-media/recordWelcomeMedia.mjs`.
 */
const MEDIA = import.meta.glob<string>("../../assets/welcome/*/*.webp", {
	eager: true,
	import: "default",
	query: "?url",
});

/** Animação do slide no idioma da interface; sem ela, a versão em inglês. */
function mediaFor(locale: Locale, slide: string): string | undefined {
	return (
		MEDIA[`../../assets/welcome/${locale}/${slide}.webp`] ??
		MEDIA[`../../assets/welcome/en/${slide}.webp`]
	);
}

interface FeatureSlide {
	id: string;
	icon: AppIconName;
	title: MessageKey;
	body: MessageKey;
	points: readonly MessageKey[];
}

/** Funções apresentadas, começando pela renomeação em si. */
const FEATURE_SLIDES: readonly FeatureSlide[] = [
	{
		id: "intro",
		icon: "rename",
		title: "welcome.intro.title",
		body: "welcome.intro.body",
		points: ["welcome.intro.point1", "welcome.intro.point2", "welcome.intro.point3"],
	},
	{
		id: "regex",
		icon: "blocks",
		title: "welcome.regex.title",
		body: "welcome.regex.body",
		points: ["welcome.regex.point1", "welcome.regex.point2", "welcome.regex.point3"],
	},
	{
		id: "watch",
		icon: "inbox",
		title: "welcome.watch.title",
		body: "welcome.watch.body",
		points: ["welcome.watch.point1", "welcome.watch.point2", "welcome.watch.point3"],
	},
	{
		id: "presets",
		icon: "save",
		title: "welcome.presets.title",
		body: "welcome.presets.body",
		points: ["welcome.presets.point1", "welcome.presets.point2", "welcome.presets.point3"],
	},
	{
		id: "safety",
		icon: "shield",
		title: "welcome.safety.title",
		body: "welcome.safety.body",
		points: ["welcome.safety.point1", "welcome.safety.point2", "welcome.safety.point3"],
	},
	{
		id: "files",
		icon: "folder",
		title: "welcome.files.title",
		body: "welcome.files.body",
		points: ["welcome.files.point1", "welcome.files.point2", "welcome.files.point3"],
	},
	{
		id: "settings",
		icon: "settings",
		title: "welcome.settings.title",
		body: "welcome.settings.body",
		points: ["welcome.settings.point1", "welcome.settings.point2", "welcome.settings.point3"],
	},
];

/** O primeiro slide escolhe o idioma; depois vêm os recursos e, por último, o apoio. */
const FIRST_FEATURE = 1;
const SLIDE_COUNT = FEATURE_SLIDES.length + 2;

interface WelcomeDialogProps {
	open: boolean;
	/** Slide inicial: o começo da apresentação ou direto o de apoio ao projeto. */
	startAt?: "start" | "support";
	/** Tema atual e troca de tema, escolhidos no primeiro slide junto com o idioma. */
	theme: ThemeMode;
	onThemeChange: (mode: ThemeMode) => void;
	onClose: () => void;
}

/**
 * Boas-vindas em carrossel horizontal: apresenta as principais funções do app e, no
 * último slide, os convites para a comunidade, doações e a estrela no GitHub.
 */
export function WelcomeDialog({
	open,
	startAt = "start",
	theme,
	onThemeChange,
	onClose,
}: WelcomeDialogProps) {
	const { t, locale, setLocale } = useI18n();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const languageLabelId = useId();
	const themeLabelId = useId();
	const [index, setIndex] = useState(0);
	const isLast = index === SLIDE_COUNT - 1;

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			setIndex(startAt === "support" ? SLIDE_COUNT - 1 : 0);
			dialog.showModal();
		} else if (!open && dialog.open) dialog.close();
	}, [open, startAt]);

	const goTo = (next: number) => setIndex(Math.min(Math.max(next, 0), SLIDE_COUNT - 1));

	const handleKeyDown = (event: KeyboardEvent) => {
		// Nos rádios de idioma, as setas trocam a opção; não passam de slide.
		if (event.target instanceof HTMLInputElement) return;
		if (event.key === "ArrowRight") goTo(index + 1);
		else if (event.key === "ArrowLeft") goTo(index - 1);
		else return;
		event.preventDefault();
	};

	return (
		<dialog
			ref={dialogRef}
			className="settings-dialog welcome-dialog"
			aria-labelledby={titleId}
			aria-roledescription={t("welcome.carousel")}
			onKeyDown={handleKeyDown}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			{open && (
				<div className="settings-content">
					<header className="settings-header">
						<h2 id={titleId}>{t("welcome.title")}</h2>
						<button
							type="button"
							className="settings-close"
							aria-label={t("settings.close")}
							title={t("settings.close")}
							onClick={onClose}
						>
							<AppIcon name="close" />
						</button>
					</header>

					<div className="welcome-carousel">
						<div className="welcome-viewport">
							<div className="welcome-track" style={{ transform: `translateX(-${index * 100}%)` }}>
								<section
									className="welcome-slide"
									aria-roledescription={t("welcome.slide")}
									aria-label={t("welcome.slideOf", { current: 1, total: SLIDE_COUNT })}
									inert={index !== 0}
								>
									<div className="welcome-hero-icon">
										<AppIcon name="globe" size={40} />
									</div>
									<h3>{t("welcome.language.title")}</h3>
									<p className="welcome-body">{t("welcome.language.body")}</p>
									{/* Trocar aqui vale para o app inteiro, como no seletor da barra de ações. */}
									<span className="welcome-choice-label" id={languageLabelId}>
										{t("welcome.language.label")}
									</span>
									<div
										className="welcome-languages"
										role="radiogroup"
										aria-labelledby={languageLabelId}
									>
										{LOCALES.map((option) => (
											<label
												key={option}
												className={`welcome-language${option === locale ? " selected" : ""}`}
												lang={option}
											>
												<input
													type="radio"
													name="welcome-language"
													checked={option === locale}
													onChange={() => setLocale(option)}
												/>
												<span className="welcome-language-code">{LOCALE_SHORT_NAMES[option]}</span>
												<span className="welcome-language-name">{LOCALE_NATIVE_NAMES[option]}</span>
												{option === locale && <AppIcon name="check" size={16} />}
											</label>
										))}
									</div>
									<span className="welcome-choice-label" id={themeLabelId}>
										{t("theme.label")}
									</span>
									<ThemeModeSelector
										theme={theme}
										onChange={onThemeChange}
										labelledBy={themeLabelId}
									/>
									<p className="welcome-hint">{t("welcome.language.hint")}</p>
								</section>
								{FEATURE_SLIDES.map((slide, f) => {
									const i = f + FIRST_FEATURE;
									const media = mediaFor(locale, slide.id);
									return (
										<section
											key={slide.id}
											className="welcome-slide"
											aria-roledescription={t("welcome.slide")}
											aria-label={t("welcome.slideOf", { current: i + 1, total: SLIDE_COUNT })}
											inert={i !== index}
										>
											{media ? (
												<div className="welcome-media">
													{/* Só o slide atual e os vizinhos carregam a animação; a chave muda
													    ao entrar no slide, para ela recomeçar do início. */}
													{Math.abs(i - index) <= 1 && (
														<img
															key={i === index ? "active" : "idle"}
															src={media}
															alt={t("welcome.mediaAlt", { feature: t(slide.title) })}
														/>
													)}
												</div>
											) : (
												<div className="welcome-hero-icon">
													<AppIcon name={slide.icon} size={40} />
												</div>
											)}
											<h3>{t(slide.title)}</h3>
											<p className="welcome-body">{t(slide.body)}</p>
											<ul className="welcome-points">
												{slide.points.map((point) => (
													<li key={point} className="welcome-point">
														<AppIcon name="check" size={14} />
														<span>{t(point)}</span>
													</li>
												))}
											</ul>
										</section>
									);
								})}
								<section
									className="welcome-slide support"
									aria-roledescription={t("welcome.slide")}
									aria-label={t("welcome.slideOf", { current: SLIDE_COUNT, total: SLIDE_COUNT })}
									inert={!isLast}
								>
									<div className="welcome-hero-icon">
										<AppIcon name="heart" size={40} />
									</div>
									<h3>{t("welcome.support.title")}</h3>
									<p className="welcome-body">{t("welcome.support.body")}</p>
									<div className="welcome-cards">
										<a className="welcome-card" href={REDDIT_URL} target="_blank" rel="noreferrer">
											<span className="welcome-card-icon">
												<AppIcon name="chat" size={22} />
											</span>
											<strong>{t("welcome.reddit.title")}</strong>
											<span className="welcome-card-text">{t("welcome.reddit.body")}</span>
											<span className="button">{t("welcome.reddit.button")}</span>
										</a>
										<div className="welcome-card">
											<span className="welcome-card-icon">
												<AppIcon name="heart" size={22} />
											</span>
											<strong>{t("welcome.donate.title")}</strong>
											<span className="welcome-card-text">{t("welcome.donate.body")}</span>
											<img
												className="welcome-qr"
												src={paypalQrCode}
												alt={t("welcome.donate.qrAlt")}
												width={116}
												height={116}
											/>
											<a
												className="button primary"
												href={PAYPAL_DONATE_URL}
												target="_blank"
												rel="noreferrer"
											>
												{t("welcome.donate.button")}
											</a>
										</div>
										<a className="welcome-card" href={GITHUB_URL} target="_blank" rel="noreferrer">
											<span className="welcome-card-icon">
												<AppIcon name="star" size={22} />
											</span>
											<strong>{t("welcome.star.title")}</strong>
											<span className="welcome-card-text">{t("welcome.star.body")}</span>
											<span className="button">{t("welcome.star.button")}</span>
										</a>
									</div>
								</section>
							</div>
						</div>

						{/* Indicadores logo abaixo dos slides, dentro da área do carrossel. */}
						<div className="welcome-dots">
							{Array.from({ length: SLIDE_COUNT }, (_, i) => (
								<button
									// biome-ignore lint/suspicious/noArrayIndexKey: os slides são fixos
									key={i}
									type="button"
									className={`welcome-dot${i === index ? " active" : ""}`}
									aria-label={t("welcome.goTo", { current: i + 1, total: SLIDE_COUNT })}
									aria-current={i === index ? "step" : undefined}
									onClick={() => goTo(i)}
								/>
							))}
						</div>
					</div>

					<footer className="settings-footer welcome-footer">
						<button type="button" className="button" onClick={onClose} hidden={isLast}>
							{t("welcome.skip")}
						</button>
						<div className="welcome-nav">
							<button
								type="button"
								className="button"
								onClick={() => goTo(index - 1)}
								disabled={index === 0}
							>
								{t("welcome.previous")}
							</button>
							{isLast ? (
								<button type="button" className="button primary" onClick={onClose}>
									{t("welcome.finish")}
								</button>
							) : (
								<button type="button" className="button primary" onClick={() => goTo(index + 1)}>
									{t("welcome.next")}
								</button>
							)}
						</div>
					</footer>
				</div>
			)}
		</dialog>
	);
}
