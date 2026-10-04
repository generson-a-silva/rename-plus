import { AppIcon, CheckField } from "@components/common";
import { type UpdateStatusState, useI18n } from "@hooks";
import { formatDateTime } from "@lib";
import { RELEASES_PAGE_URL } from "@shared/updates";
import { SettingsSection } from "./SettingsSection";

interface UpdatesSectionProps {
	updates: UpdateStatusState;
}

/** Versão instalada, verificação de novas versões no GitHub e suas preferências. */
export function UpdatesSection({ updates }: UpdatesSectionProps) {
	const { t, locale } = useI18n();
	const { status, check, changeSettings } = updates;
	if (!status) return null;
	const { state, settings, currentVersion } = status;

	const checkedAt = "checkedAt" in state ? formatDateTime(state.checkedAt, locale) : "";
	const skipped = state.status === "available" && state.release.version === settings.skippedVersion;

	return (
		<SettingsSection
			icon="download"
			title={t("updates.title")}
			description={t("updates.description")}
		>
			<div className="settings-row">
				<div className="update-summary">
					<span className="settings-row-label">
						{t("updates.installed", { version: currentVersion })}
					</span>
					{state.status === "checking" && (
						<span className="update-state">{t("updates.checking")}</span>
					)}
					{state.status === "upToDate" && (
						<span className="update-state ok">{t("updates.upToDate", { time: checkedAt })}</span>
					)}
					{state.status === "error" && <span className="update-state error">{state.error}</span>}
					{state.status === "available" && (
						<span className="update-state available">
							{t(skipped ? "updates.skippedVersion" : "updates.available", {
								version: state.release.version,
							})}
						</span>
					)}
				</div>
				<button
					type="button"
					className="button"
					disabled={state.status === "checking"}
					onClick={() => void check()}
				>
					<AppIcon name="refresh" size={14} />
					{t("updates.checkNow")}
				</button>
			</div>

			{state.status === "available" && (
				<div className="update-actions">
					<a className="button primary" href={state.release.url} target="_blank" rel="noreferrer">
						<AppIcon name="download" size={14} />
						{t("updates.download")}
					</a>
					{skipped ? (
						<button
							type="button"
							className="button"
							onClick={() => void changeSettings({ skippedVersion: "" })}
						>
							{t("updates.unskip")}
						</button>
					) : (
						<button
							type="button"
							className="button"
							title={t("updates.skipHint")}
							onClick={() => void changeSettings({ skippedVersion: state.release.version })}
						>
							{t("updates.skip")}
						</button>
					)}
				</div>
			)}

			<CheckField
				label={t("updates.autoCheck")}
				checked={settings.autoCheck}
				onChange={(autoCheck) => void changeSettings({ autoCheck })}
			/>
			<p className="settings-hint">
				{t("updates.privacy")}{" "}
				<a href={RELEASES_PAGE_URL} target="_blank" rel="noreferrer">
					{t("updates.allReleases")}
				</a>
			</p>
		</SettingsSection>
	);
}
