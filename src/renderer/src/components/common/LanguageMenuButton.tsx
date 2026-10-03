import { useI18n } from "@hooks";
import { LOCALE_NATIVE_NAMES, LOCALE_SHORT_NAMES, LOCALES, type Locale } from "@shared/i18n";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";

/** Distância entre o botão e a lista que abre acima dele. */
const MENU_GAP = 6;

interface MenuPosition {
	right: number;
	bottom: number;
}

/**
 * Botão de idioma: mostra o idioma atual e, ao clicar, abre acima dele a lista dos
 * idiomas suportados (cada um no próprio idioma). A lista usa posição fixa para não
 * ser cortada pela coluna de ações.
 */
export function LanguageMenuButton() {
	const { locale, setLocale, t } = useI18n();
	const [position, setPosition] = useState<MenuPosition | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const open = position !== null;

	const close = (returnFocus = false) => {
		setPosition(null);
		if (returnFocus) buttonRef.current?.focus();
	};

	const toggle = () => {
		if (open) return close();
		const rect = buttonRef.current?.getBoundingClientRect();
		if (!rect) return;
		setPosition({
			right: window.innerWidth - rect.right,
			bottom: window.innerHeight - rect.top + MENU_GAP,
		});
	};

	const choose = (next: Locale) => {
		setLocale(next);
		close(true);
	};

	// Ao abrir, foca o idioma atual; fecha com clique fora, redimensionamento ou perda de foco da janela.
	useEffect(() => {
		if (!open) return;
		menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
				setPosition(null);
			}
		};
		const onDismiss = () => setPosition(null);
		window.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("resize", onDismiss);
		window.addEventListener("blur", onDismiss);
		return () => {
			window.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("resize", onDismiss);
			window.removeEventListener("blur", onDismiss);
		};
	}, [open]);

	const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
		const current = items.indexOf(document.activeElement as HTMLButtonElement);
		const focusAt = (index: number) => items[(index + items.length) % items.length]?.focus();
		if (event.key === "ArrowDown") focusAt(current + 1);
		else if (event.key === "ArrowUp") focusAt(current - 1);
		else if (event.key === "Home") focusAt(0);
		else if (event.key === "End") focusAt(items.length - 1);
		else if (event.key === "Escape") close(true);
		else if (event.key === "Tab") close();
		else return;
		if (event.key !== "Tab") event.preventDefault();
	};

	const label = t("language.button", { language: LOCALE_NATIVE_NAMES[locale] });

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				className={`language-button${open ? " open" : ""}`}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={label}
				title={label}
				onClick={toggle}
			>
				<AppIcon name="globe" size={14} />
				<span>{LOCALE_SHORT_NAMES[locale]}</span>
				<AppIcon name="chevronUp" size={12} />
			</button>
			{position && (
				<div
					ref={menuRef}
					className="language-menu"
					role="menu"
					aria-label={t("language.menu")}
					style={{ right: position.right, bottom: position.bottom }}
					onKeyDown={onMenuKeyDown}
				>
					{LOCALES.map((option) => (
						<button
							key={option}
							type="button"
							role="menuitemradio"
							aria-checked={option === locale}
							lang={option}
							className="language-option"
							onClick={() => choose(option)}
						>
							<span>{LOCALE_NATIVE_NAMES[option]}</span>
							{option === locale && <AppIcon name="check" size={14} />}
						</button>
					))}
				</div>
			)}
		</>
	);
}
