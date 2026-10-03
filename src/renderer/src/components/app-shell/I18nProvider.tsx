import { I18nContext, useI18nState } from "@hooks";
import type { ReactNode } from "react";

/** Disponibiliza idioma e traduções (`useI18n()`) para toda a interface. */
export function I18nProvider({ children }: { children: ReactNode }) {
	return <I18nContext.Provider value={useI18nState()}>{children}</I18nContext.Provider>;
}
