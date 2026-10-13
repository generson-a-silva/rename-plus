import { useI18n } from "@hooks";
import { LOCALE_NATIVE_NAMES, LOCALES } from "@shared/i18n";
import { useId } from "react";
import { LocaleFlag } from "./LocaleFlag";

interface LanguageSelectorProps {
	/** `id` do rótulo visível do grupo. */
	labelledBy: string;
}

/** Idioma da interface: cada opção aparece escrita no próprio idioma (botões lado a lado). */
export function LanguageSelector({ labelledBy }: LanguageSelectorProps) {
	const { locale, setLocale } = useI18n();
	const name = useId();
	return (
		<div className="segmented" role="radiogroup" aria-labelledby={labelledBy}>
			{LOCALES.map((option) => (
				<label key={option} className="segmented-option" lang={option}>
					<input
						type="radio"
						name={name}
						value={option}
						checked={locale === option}
						onChange={() => setLocale(option)}
					/>
					<LocaleFlag locale={option} />
					{LOCALE_NATIVE_NAMES[option]}
				</label>
			))}
		</div>
	);
}
