import { AppIcon, CheckField, PresetSelect, TextField } from "@components/common";
import { useI18n, useWatchFolders } from "@hooks";
import { baseName, formatDateTime, joinPath, type RenamePreset } from "@lib";
import type { MessageKey } from "@shared/i18n";
import type { WatchActivity, WatchRuleStatus } from "@shared/ipc";
import { createDefaultOptions, type RenameOptions, type RenameSection } from "@shared/rename";
import {
	createWatchRule,
	planWatchedFile,
	type WatchRule,
	type WatchRuleProblem,
	watchRuleProblem,
} from "@shared/watch";
import { useId, useMemo, useState } from "react";
import { BackgroundModeCard } from "./BackgroundModeCard";
import { SettingsSection, SettingsSubsection } from "./SettingsSection";

const SECTION_TITLES: Record<RenameSection, MessageKey> = {
	regex: "regex.title",
	name: "name.title",
	replace: "replace.title",
	case: "case.title",
	remove: "remove.title",
	add: "add.title",
	autoDate: "autoDate.title",
	appendFolder: "appendFolder.title",
	numbering: "numbering.title",
	extension: "extension.title",
};

const PROBLEM_KEYS: Record<WatchRuleProblem, MessageKey> = {
	noFolder: "watch.problemNoFolder",
	noAction: "watch.problemNoAction",
};

/** Seções das regras de renomeação que diferem do padrão (o que a regra faz com o nome). */
function activeSections(options: RenameOptions): RenameSection[] {
	const defaults = createDefaultOptions();
	return (Object.keys(SECTION_TITLES) as RenameSection[]).filter(
		(section) => JSON.stringify(options[section]) !== JSON.stringify(defaults[section]),
	);
}

function StatusBadge({ status, rule }: { status: WatchRuleStatus | undefined; rule: WatchRule }) {
	const { t } = useI18n();
	// Antes da resposta do processo principal, mostra o que a configuração indica.
	const problem = watchRuleProblem(rule);
	const effective: WatchRuleStatus =
		status ??
		(!rule.enabled
			? { state: "disabled" }
			: problem
				? { state: "incomplete", problem }
				: { state: "watching" });
	switch (effective.state) {
		case "watching":
			return <span className="watch-status watching">{t("watch.statusWatching")}</span>;
		case "disabled":
			return <span className="watch-status">{t("watch.statusDisabled")}</span>;
		case "incomplete":
			return <span className="watch-status incomplete">{t(PROBLEM_KEYS[effective.problem])}</span>;
		case "error":
			return (
				<span className="watch-status error" title={effective.error}>
					{t("watch.statusError", { error: effective.error })}
				</span>
			);
	}
}

interface FolderFieldProps {
	label: string;
	value: string;
	placeholder: string;
	onChange: (value: string) => void;
	/** Mostra um botão para limpar o campo. */
	clearable?: boolean;
}

/** Caminho de pasta: digitado ou escolhido no diálogo do sistema. */
function FolderField({ label, value, placeholder, onChange, clearable }: FolderFieldProps) {
	const { t } = useI18n();
	const id = useId();
	return (
		<div className="field">
			<label htmlFor={id}>{label}</label>
			<div className="folder-field">
				<input
					id={id}
					type="text"
					className="mono"
					value={value}
					placeholder={placeholder}
					spellCheck={false}
					onChange={(event) => onChange(event.target.value)}
				/>
				<button
					type="button"
					className="button"
					onClick={async () => {
						const picked = await window.api.pickFolder(value || (await window.api.getHomeDir()));
						if (picked) onChange(picked);
					}}
				>
					<AppIcon name="open" size={14} />
					{t("watch.pick")}
				</button>
				{clearable && value && (
					<button
						type="button"
						className="button icon-only"
						title={t("watch.clearDestination")}
						aria-label={t("watch.clearDestination")}
						onClick={() => onChange("")}
					>
						<AppIcon name="close" size={14} />
					</button>
				)}
			</div>
		</div>
	);
}

/** Simula a regra com um nome digitado, sem tocar no disco. */
function RuleTester({ rule }: { rule: WatchRule }) {
	const { t, tr } = useI18n();
	const [sample, setSample] = useState("Documento Exemplo.pdf");
	const folder = rule.folder || "/";
	const plan = planWatchedFile(
		rule,
		{
			path: joinPath(folder, sample),
			dir: folder,
			name: sample,
			isDir: false,
			hidden: false,
			size: 0,
			mtimeMs: Date.now(),
			birthtimeMs: Date.now(),
		},
		0,
		new Date(),
		window.api.platform,
	);
	let result: string;
	let kind = "";
	if (!sample.trim()) {
		result = "";
	} else if (plan.kind === "skip") {
		result = t("watch.testSkipped");
	} else if (plan.kind === "error") {
		result = tr(plan.error);
		kind = "error";
	} else {
		result = plan.dir === folder ? plan.name : joinPath(plan.dir, plan.name);
		kind = "ok";
	}
	return (
		<div className="watch-tester">
			<TextField label={t("watch.testLabel")} value={sample} onChange={setSample} />
			<p className={`watch-test-result ${kind}`}>
				<span aria-hidden="true">→</span> {result}
			</p>
		</div>
	);
}

interface RuleCardProps {
	rule: WatchRule;
	status: WatchRuleStatus | undefined;
	currentOptions: RenameOptions;
	presets: readonly RenamePreset[];
	defaultOpen: boolean;
	onChange: (patch: Partial<WatchRule>) => void;
	onRemove: () => void;
}

function RuleCard({
	rule,
	status,
	currentOptions,
	presets,
	defaultOpen,
	onChange,
	onRemove,
}: RuleCardProps) {
	const { t } = useI18n();
	const sections = activeSections(rule.rename);
	const title = rule.name.trim() || (rule.folder ? baseName(rule.folder) : t("watch.newRule"));
	const currentSections = activeSections(currentOptions);

	return (
		<details className="watch-rule" open={defaultOpen}>
			<summary className="watch-rule-summary">
				<span className="settings-subsection-chevron">
					<AppIcon name="chevron" size={14} />
				</span>
				{/* O clique no interruptor não abre/fecha a gaveta. */}
				<input
					type="checkbox"
					className="watch-rule-toggle"
					checked={rule.enabled}
					title={t(rule.enabled ? "watch.disable" : "watch.enable")}
					aria-label={t(rule.enabled ? "watch.disable" : "watch.enable")}
					onClick={(event) => event.stopPropagation()}
					onChange={(event) => onChange({ enabled: event.target.checked })}
				/>
				<span className="watch-rule-title">
					<strong>{title}</strong>
					{rule.folder && <code>{rule.folder}</code>}
				</span>
				<StatusBadge status={status} rule={rule} />
			</summary>
			<div className="watch-rule-body">
				<div className="grid-2">
					<TextField
						label={t("watch.name")}
						value={rule.name}
						placeholder={rule.folder ? baseName(rule.folder) : ""}
						onChange={(name) => onChange({ name })}
					/>
					<TextField
						label={t("watch.mask")}
						mono
						value={rule.mask}
						placeholder={t("watch.maskPlaceholder")}
						onChange={(mask) => onChange({ mask })}
					/>
				</div>
				<FolderField
					label={t("watch.folder")}
					value={rule.folder}
					placeholder={t("watch.folderPlaceholder")}
					onChange={(folder) => onChange({ folder })}
				/>

				<div className="field">
					<span className="field-label">{t("watch.renameLabel")}</span>
					<div className="watch-rename">
						<span className="watch-sections">
							{sections.length === 0
								? t("watch.renameNone")
								: sections.map((section) => (
										<span key={section} className="integration-badge accent">
											{t(SECTION_TITLES[section])}
										</span>
									))}
						</span>
						{/* Escolher um preset copia as opções dele para a regra. */}
						<PresetSelect
							presets={presets}
							options={rule.rename}
							onSelect={(preset) => onChange({ rename: structuredClone(preset.options) })}
						/>
						<button
							type="button"
							className="button"
							disabled={currentSections.length === 0}
							title={
								currentSections.length === 0
									? t("watch.useCurrentEmpty")
									: t("watch.useCurrentHint")
							}
							onClick={() => onChange({ rename: structuredClone(currentOptions) })}
						>
							{t("watch.useCurrent")}
						</button>
						{sections.length > 0 && (
							<button
								type="button"
								className="button"
								onClick={() => onChange({ rename: createDefaultOptions() })}
							>
								{t("watch.renameClear")}
							</button>
						)}
					</div>
				</div>

				<FolderField
					label={t("watch.destination")}
					value={rule.destination}
					placeholder={t("watch.destinationPlaceholder")}
					clearable
					onChange={(destination) => onChange({ destination })}
				/>

				<RuleTester rule={rule} />

				<div className="watch-rule-footer">
					<CheckField
						label={t("watch.notify")}
						checked={rule.notify}
						onChange={(notify) => onChange({ notify })}
					/>
					<button type="button" className="button danger" onClick={onRemove}>
						<AppIcon name="trash" size={14} />
						{t("watch.remove")}
					</button>
				</div>
			</div>
		</details>
	);
}

function ActivityList({ items }: { items: WatchActivity[] }) {
	const { t, locale } = useI18n();
	return (
		<ul className="watch-activity">
			{items.map((item) => (
				<li key={item.id} className={item.error ? "error" : undefined}>
					<span className="watch-activity-time">{formatDateTime(item.time, locale)}</span>
					<span className="watch-activity-rule">{item.ruleName}</span>
					<span className="watch-activity-detail" title={item.to ?? item.error ?? ""}>
						{baseName(item.from)} →{" "}
						{item.to ? baseName(item.to) : t("watch.activityFailed", { error: item.error ?? "" })}
					</span>
				</li>
			))}
		</ul>
	);
}

interface WatchFoldersSectionProps {
	/** Regras de renomeação da tela principal, que podem ser copiadas para uma regra. */
	currentOptions: RenameOptions;
	/** Presets de renomeação, que também podem ser copiados para uma regra. */
	presets: readonly RenamePreset[];
}

/**
 * Pastas monitoradas: arquivos novos numa pasta são renomeados (e opcionalmente movidos)
 * automaticamente. Sem regras, o padrão, nada é monitorado.
 */
export function WatchFoldersSection({ currentOptions, presets }: WatchFoldersSectionProps) {
	const { t } = useI18n();
	const { rules, info, changeRules, clearActivity } = useWatchFolders();
	const [createdId, setCreatedId] = useState<string | null>(null);
	const activity = info?.activity ?? [];
	const errors = useMemo(() => activity.filter((item) => item.error).length, [activity]);

	const updateRule = (id: string, patch: Partial<WatchRule>) =>
		changeRules((list) => list.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

	const removeRule = async (rule: WatchRule) => {
		const confirmed = await window.api.confirm({
			message: t("watch.removeConfirm", { name: rule.name.trim() || baseName(rule.folder) || "—" }),
			confirmLabel: t("watch.remove"),
			severity: "warning",
		});
		if (confirmed) changeRules((list) => list.filter((item) => item.id !== rule.id));
	};

	const addRule = () => {
		const rule = createWatchRule(crypto.randomUUID());
		setCreatedId(rule.id);
		changeRules((list) => [...list, rule]);
	};

	return (
		<SettingsSection
			icon="inbox"
			title={t("watch.title")}
			description={
				<>
					<p>{t("watch.description")}</p>
					<p>{t("watch.descriptionLimits")}</p>
				</>
			}
		>
			<BackgroundModeCard />
			{rules === null ? (
				<p className="integration-loading">{t("integration.loading")}</p>
			) : (
				<>
					{rules.length === 0 && <p className="watch-empty">{t("watch.empty")}</p>}
					{rules.map((rule) => (
						<RuleCard
							key={rule.id}
							rule={rule}
							status={info?.statuses[rule.id]}
							currentOptions={currentOptions}
							presets={presets}
							defaultOpen={rule.id === createdId}
							onChange={(patch) => updateRule(rule.id, patch)}
							onRemove={() => void removeRule(rule)}
						/>
					))}
					<div>
						<button type="button" className="button" onClick={addRule}>
							<AppIcon name="plus" size={14} />
							{t("watch.add")}
						</button>
					</div>
					{activity.length > 0 && (
						<SettingsSubsection
							title={
								errors > 0
									? t("watch.activityTitleErrors", { count: errors })
									: t("watch.activityTitle")
							}
							count={activity.length}
						>
							<ActivityList items={activity} />
							<div>
								<button type="button" className="button" onClick={clearActivity}>
									{t("watch.activityClear")}
								</button>
							</div>
						</SettingsSubsection>
					)}
				</>
			)}
		</SettingsSection>
	);
}
