import { CheckField } from "@components/common";
import { useI18n } from "@hooks";
import { SettingsSection } from "./SettingsSection";

interface RenameSettingsSectionProps {
	skipConfirmation: boolean;
	onSkipConfirmationChange: (skip: boolean) => void;
}

/** Opções do botão Renomear: por ora, se exibe a janela de confirmação. */
export function RenameSettingsSection({
	skipConfirmation,
	onSkipConfirmationChange,
}: RenameSettingsSectionProps) {
	const { t } = useI18n();
	return (
		<SettingsSection icon="rename" title={t("renameSettings.title")}>
			<CheckField
				label={t("renameSettings.skipConfirmation")}
				checked={skipConfirmation}
				onChange={onSkipConfirmationChange}
			/>
			<p className="settings-hint">{t("renameSettings.skipConfirmationHint")}</p>
		</SettingsSection>
	);
}
