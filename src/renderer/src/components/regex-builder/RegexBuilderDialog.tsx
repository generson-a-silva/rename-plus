import { AppIcon, CheckField, NumberField, SelectField, TextField } from "@components/common";
import { useI18n, usePersistentState } from "@hooks";
import { insertItem, moveItem } from "@lib";
import type { MessageKey } from "@shared/i18n";
import {
	brokenGroupRefs,
	capturedBlocks,
	compileRegexBuilder,
	createEmptyRegexBuilder,
	createPatternBlock,
	createRegexPreset,
	createReplacementBlock,
	PATTERN_BLOCK_INFO,
	type PatternBlock,
	type PatternBlockType,
	QUANTIFIER_KINDS,
	type Quantifier,
	type QuantifierKind,
	REGEX_PRESET_IDS,
	type RegexBuilderModel,
	type RegexPresetId,
	type ReplacementBlock,
	type ReplacementBlockType,
	sanitizeRegexBuilder,
} from "@shared/regex-builder";
import {
	createDefaultOptions,
	createRenamer,
	type RegexOptions,
	RenameConfigError,
} from "@shared/rename";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BlockPalette, BlockStrip, type PaletteItem } from "./BlockStrip";

const PATTERN_MIME = "application/x-rename-plus-pattern";
const REPLACEMENT_MIME = "application/x-rename-plus-replacement";
/** Nomes de exemplo exibidos na pré-visualização. */
const MAX_SAMPLES = 8;

const PATTERN_LABELS: Record<PatternBlockType, { label: MessageKey; hint: MessageKey }> = {
	start: { label: "rxb.start", hint: "rxb.startHint" },
	end: { label: "rxb.end", hint: "rxb.endHint" },
	text: { label: "rxb.text", hint: "rxb.textHint" },
	alternatives: { label: "rxb.alternatives", hint: "rxb.alternativesHint" },
	oneOf: { label: "rxb.oneOf", hint: "rxb.oneOfHint" },
	noneOf: { label: "rxb.noneOf", hint: "rxb.noneOfHint" },
	digit: { label: "rxb.digit", hint: "rxb.digitHint" },
	letter: { label: "rxb.letter", hint: "rxb.letterHint" },
	letterOrDigit: { label: "rxb.letterOrDigit", hint: "rxb.letterOrDigitHint" },
	space: { label: "rxb.space", hint: "rxb.spaceHint" },
	separator: { label: "rxb.separator", hint: "rxb.separatorHint" },
	anyChar: { label: "rxb.anyChar", hint: "rxb.anyCharHint" },
};

/** Paleta da busca, agrupada para o usuário achar o bloco pelo que ele representa. */
const PATTERN_GROUPS: readonly { label: MessageKey; types: readonly PatternBlockType[] }[] = [
	{ label: "rxb.groupPosition", types: ["start", "end"] },
	{ label: "rxb.groupText", types: ["text", "alternatives", "oneOf", "noneOf"] },
	{
		label: "rxb.groupKinds",
		types: ["digit", "letter", "letterOrDigit", "space", "separator", "anyChar"],
	},
];

const VALUE_LABELS: Partial<Record<PatternBlockType, MessageKey>> = {
	text: "rxb.valueText",
	alternatives: "rxb.valueAlternatives",
	oneOf: "rxb.valueChars",
	noneOf: "rxb.valueChars",
};

const QUANTIFIER_LABELS: Record<QuantifierKind, MessageKey> = {
	one: "rxb.qOne",
	optional: "rxb.qOptional",
	oneOrMore: "rxb.qOneOrMore",
	zeroOrMore: "rxb.qZeroOrMore",
	exactly: "rxb.qExactly",
	between: "rxb.qBetween",
};

/** Repetições em que "o mínimo possível" faz diferença. */
const LAZY_KINDS: readonly QuantifierKind[] = ["optional", "oneOrMore", "zeroOrMore", "between"];

const REPLACEMENT_LABELS: Record<ReplacementBlockType, { label: MessageKey; hint: MessageKey }> = {
	text: { label: "rxb.rText", hint: "rxb.rTextHint" },
	group: { label: "rxb.rGroup", hint: "rxb.rGroupHint" },
	match: { label: "rxb.rMatch", hint: "rxb.rMatchHint" },
};

const PRESET_LABELS: Record<RegexPresetId, MessageKey> = {
	spacesToUnderscore: "rxb.presetSpaces",
	prefixToText: "rxb.presetPrefix",
	removeLeadingNumbers: "rxb.presetLeadingNumbers",
	swapDate: "rxb.presetSwapDate",
	removeParentheses: "rxb.presetParentheses",
};

const newId = () => crypto.randomUUID();

type Flags = Pick<RegexOptions, "global" | "ignoreCase" | "includeExt">;

interface RegexBuilderDialogProps {
	open: boolean;
	/** Opções atuais do painel RegEx (as caixas de seleção começam iguais a elas). */
	value: RegexOptions;
	/** Nomes dos itens selecionados (ou visíveis), para testar a expressão. */
	sampleNames: readonly string[];
	onApply: (options: RegexOptions) => void;
	onClose: () => void;
}

/**
 * Construtor visual de RegEx: busca e substituição montadas com blocos arrastáveis,
 * com pré-visualização nos arquivos e a expressão gerada à vista de quem a conhece.
 */
export function RegexBuilderDialog({
	open,
	value,
	sampleNames,
	onApply,
	onClose,
}: RegexBuilderDialogProps) {
	const { t } = useI18n();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const [saved, setSaved] = usePersistentState<RegexBuilderModel>(
		"regexBuilder",
		createEmptyRegexBuilder(),
	);
	const [model, setModel] = useState<RegexBuilderModel>(createEmptyRegexBuilder);
	const [flags, setFlags] = useState<Flags>({
		global: false,
		ignoreCase: false,
		includeExt: false,
	});

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	}, [open]);

	// Ao abrir: retoma o último modelo montado e as opções atuais do painel.
	const savedRef = useRef(saved);
	savedRef.current = saved;
	const valueRef = useRef(value);
	valueRef.current = value;
	useEffect(() => {
		if (!open) return;
		setModel(sanitizeRegexBuilder(savedRef.current));
		const { global, ignoreCase, includeExt } = valueRef.current;
		setFlags({ global, ignoreCase, includeExt });
	}, [open]);

	const compiled = useMemo(() => compileRegexBuilder(model), [model]);
	const broken = useMemo(() => brokenGroupRefs(model), [model]);
	const groups = useMemo(() => capturedBlocks(model.pattern), [model.pattern]);
	const options: RegexOptions = { ...compiled, ...flags };
	// O painel já tem uma RegEx diferente, digitada à mão: aplicar vai substituí-la.
	const replacesManual =
		value.match !== "" && (value.match !== compiled.match || value.replace !== compiled.replace);

	const updatePattern = (id: string, patch: Partial<PatternBlock>) =>
		setModel((prev) => ({
			...prev,
			pattern: prev.pattern.map((block) => (block.id === id ? { ...block, ...patch } : block)),
		}));
	const updateQuantifier = (block: PatternBlock, patch: Partial<Quantifier>) =>
		updatePattern(block.id, { quantifier: { ...block.quantifier, ...patch } });
	const updateReplacement = (id: string, patch: Partial<ReplacementBlock>) =>
		setModel((prev) => ({
			...prev,
			replacement: prev.replacement.map((block) =>
				block.id === id ? { ...block, ...patch } : block,
			),
		}));

	const insertPattern = (type: string, index: number) =>
		setModel((prev) => ({
			...prev,
			pattern: insertItem(
				prev.pattern,
				createPatternBlock(type as PatternBlockType, newId()),
				index,
			),
		}));
	const insertReplacement = (type: string, index: number) =>
		setModel((prev) => {
			// "Trecho guardado" já aponta para o primeiro trecho disponível.
			const ref = capturedBlocks(prev.pattern)[0]?.id ?? "";
			const block = createReplacementBlock(type as ReplacementBlockType, newId(), { ref });
			return { ...prev, replacement: insertItem(prev.replacement, block, index) };
		});

	const loadPreset = (id: RegexPresetId) => {
		const preset = createRegexPreset(id, newId);
		setModel(preset.model);
		setFlags((prev) => ({ ...prev, global: preset.global }));
	};

	const apply = () => {
		setSaved(model);
		onApply(options);
		onClose();
	};

	const groupLabel = (block: PatternBlock) => {
		const number = groups.indexOf(block) + 1;
		const detail =
			PATTERN_BLOCK_INFO[block.type].hasValue && block.value ? ` “${block.value}”` : "";
		return t("rxb.groupOption", {
			number,
			name: `${t(PATTERN_LABELS[block.type].label)}${detail}`,
		});
	};

	const patternPalette = (types: readonly PatternBlockType[]): PaletteItem[] =>
		types.map((type) => ({
			type,
			label: t(PATTERN_LABELS[type].label),
			hint: t(PATTERN_LABELS[type].hint),
		}));

	return (
		<dialog
			ref={dialogRef}
			className="settings-dialog rx-dialog"
			aria-labelledby={titleId}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			{open && (
				<div className="settings-content">
					<header className="settings-header">
						<h2 id={titleId}>{t("rxb.title")}</h2>
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

					<div className="rx-body">
						<p className="rx-intro">{t("rxb.intro")}</p>

						<div className="rx-presets">
							<span className="rx-palette-label">{t("rxb.presets")}</span>
							{REGEX_PRESET_IDS.map((id) => (
								<button
									key={id}
									type="button"
									className="rx-chip preset"
									onClick={() => loadPreset(id)}
								>
									{t(PRESET_LABELS[id])}
								</button>
							))}
							{(model.pattern.length > 0 || model.replacement.length > 0) && (
								<button
									type="button"
									className="rx-chip"
									onClick={() => setModel(createEmptyRegexBuilder())}
								>
									<AppIcon name="reset" size={12} />
									{t("rxb.clear")}
								</button>
							)}
						</div>

						<section className="rx-section">
							<h3>
								<span className="rx-step">1</span>
								{t("rxb.findTitle")}
							</h3>
							{PATTERN_GROUPS.map((group) => (
								<BlockPalette
									key={group.label}
									label={t(group.label)}
									items={patternPalette(group.types)}
									mime={PATTERN_MIME}
									onAdd={(type) => insertPattern(type, model.pattern.length)}
								/>
							))}
							<BlockStrip
								label={t("rxb.findTitle")}
								items={model.pattern}
								mime={PATTERN_MIME}
								emptyText={t("rxb.findEmpty")}
								onInsert={insertPattern}
								onMove={(id, index) =>
									setModel((prev) => ({ ...prev, pattern: moveItem(prev.pattern, id, index) }))
								}
								onRemove={(id) =>
									setModel((prev) => ({
										...prev,
										pattern: prev.pattern.filter((block) => block.id !== id),
									}))
								}
								renderTitle={(block) => (
									<>
										{t(PATTERN_LABELS[block.type].label)}
										{groups.includes(block) && (
											<span className="rx-group-badge">
												{t("rxb.groupBadge", { number: groups.indexOf(block) + 1 })}
											</span>
										)}
									</>
								)}
								renderBody={(block) => (
									<PatternBlockFields
										block={block}
										onChange={(patch) => updatePattern(block.id, patch)}
										onQuantifierChange={(patch) => updateQuantifier(block, patch)}
									/>
								)}
							/>
						</section>

						<section className="rx-section">
							<h3>
								<span className="rx-step">2</span>
								{t("rxb.replaceTitle")}
							</h3>
							<BlockPalette
								label={t("rxb.groupReplace")}
								items={(["text", "group", "match"] as const).map((type) => ({
									type,
									label: t(REPLACEMENT_LABELS[type].label),
									hint: t(REPLACEMENT_LABELS[type].hint),
								}))}
								mime={REPLACEMENT_MIME}
								onAdd={(type) => insertReplacement(type, model.replacement.length)}
							/>
							<BlockStrip
								label={t("rxb.replaceTitle")}
								items={model.replacement}
								mime={REPLACEMENT_MIME}
								emptyText={t("rxb.replaceEmpty")}
								onInsert={insertReplacement}
								onMove={(id, index) =>
									setModel((prev) => ({
										...prev,
										replacement: moveItem(prev.replacement, id, index),
									}))
								}
								onRemove={(id) =>
									setModel((prev) => ({
										...prev,
										replacement: prev.replacement.filter((block) => block.id !== id),
									}))
								}
								isInvalid={(block) => broken.has(block.id)}
								renderTitle={(block) => t(REPLACEMENT_LABELS[block.type].label)}
								renderBody={(block) => {
									switch (block.type) {
										case "text":
											return (
												<TextField
													label={t("rxb.valueText")}
													value={block.value}
													onChange={(text) => updateReplacement(block.id, { value: text })}
												/>
											);
										case "match":
											return <p className="rx-block-note">{t("rxb.rMatchHint")}</p>;
										case "group":
											return groups.length === 0 ? (
												<p className="rx-block-note error">{t("rxb.noGroups")}</p>
											) : (
												<SelectField
													label={t("rxb.rGroupPick")}
													value={broken.has(block.id) ? "" : block.ref}
													options={[
														...(broken.has(block.id) ? [["", t("rxb.groupMissing")] as const] : []),
														...groups.map((group) => [group.id, groupLabel(group)] as const),
													]}
													onChange={(ref) => updateReplacement(block.id, { ref })}
												/>
											);
									}
								}}
							/>
						</section>

						<div className="checks rx-flags">
							<CheckField
								label={t("regex.global")}
								title={t("regex.globalHint")}
								checked={flags.global}
								onChange={(global) => setFlags((prev) => ({ ...prev, global }))}
							/>
							<CheckField
								label={t("regex.ignoreCase")}
								checked={flags.ignoreCase}
								onChange={(ignoreCase) => setFlags((prev) => ({ ...prev, ignoreCase }))}
							/>
							<CheckField
								label={t("regex.includeExt")}
								checked={flags.includeExt}
								onChange={(includeExt) => setFlags((prev) => ({ ...prev, includeExt }))}
							/>
						</div>

						<RegexPreview options={options} sampleNames={sampleNames} />

						<details className="rx-generated">
							<summary className="rx-generated-summary">{t("rxb.generated")}</summary>
							<dl>
								<dt>{t("field.find")}</dt>
								<dd>
									<code>{compiled.match || "—"}</code>
								</dd>
								<dt>{t("regex.replace")}</dt>
								<dd>
									<code>{compiled.replace || "—"}</code>
								</dd>
							</dl>
						</details>
					</div>

					<footer className="settings-footer rx-footer">
						{replacesManual && <p className="rx-warning">{t("rxb.replacesManual")}</p>}
						<button type="button" className="button" onClick={onClose}>
							{t("common.cancel")}
						</button>
						<button
							type="button"
							className="button primary"
							disabled={broken.size > 0}
							title={broken.size > 0 ? t("rxb.fixGroups") : undefined}
							onClick={apply}
						>
							{t("rxb.apply")}
						</button>
					</footer>
				</div>
			)}
		</dialog>
	);
}

interface PatternBlockFieldsProps {
	block: PatternBlock;
	onChange: (patch: Partial<PatternBlock>) => void;
	onQuantifierChange: (patch: Partial<Quantifier>) => void;
}

/** Campos de um bloco da busca: valor, repetição e "guardar trecho". */
function PatternBlockFields({ block, onChange, onQuantifierChange }: PatternBlockFieldsProps) {
	const { t } = useI18n();
	const info = PATTERN_BLOCK_INFO[block.type];
	const valueLabel = VALUE_LABELS[block.type];
	const { quantifier } = block;
	if (!info.quantifiable)
		return <p className="rx-block-note">{t(PATTERN_LABELS[block.type].hint)}</p>;
	return (
		<>
			{valueLabel && (
				<TextField
					label={t(valueLabel)}
					mono
					value={block.value}
					onChange={(text) => onChange({ value: text })}
				/>
			)}
			<SelectField
				label={t("rxb.repeat")}
				value={quantifier.kind}
				options={QUANTIFIER_KINDS.map((kind) => [kind, t(QUANTIFIER_LABELS[kind])] as const)}
				onChange={(kind) => onQuantifierChange({ kind })}
			/>
			{quantifier.kind === "exactly" && (
				<NumberField
					label={t("rxb.times")}
					min={1}
					max={999}
					value={quantifier.min}
					onChange={(min) => onQuantifierChange({ min })}
				/>
			)}
			{quantifier.kind === "between" && (
				<div className="grid-2">
					<NumberField
						label={t("rxb.min")}
						min={0}
						max={999}
						value={quantifier.min}
						onChange={(min) => onQuantifierChange({ min })}
					/>
					<NumberField
						label={t("rxb.max")}
						min={1}
						max={999}
						value={quantifier.max}
						onChange={(max) => onQuantifierChange({ max })}
					/>
				</div>
			)}
			{LAZY_KINDS.includes(quantifier.kind) && (
				<CheckField
					label={t("rxb.lazy")}
					title={t("rxb.lazyHint")}
					checked={quantifier.lazy}
					onChange={(lazy) => onQuantifierChange({ lazy })}
				/>
			)}
			<CheckField
				label={t("rxb.capture")}
				title={t("rxb.captureHint")}
				checked={block.capture}
				onChange={(capture) => onChange({ capture })}
			/>
		</>
	);
}

interface RegexPreviewProps {
	options: RegexOptions;
	sampleNames: readonly string[];
}

/** Resultado da expressão nos arquivos selecionados e num nome digitado. */
function RegexPreview({ options, sampleNames }: RegexPreviewProps) {
	const { t, tr } = useI18n();
	const [testName, setTestName] = useState("");

	// Sem repetidos: o nome digitado pode ser igual a um dos selecionados (e serve de chave).
	const names = [
		...new Set([testName.trim(), ...sampleNames.slice(0, MAX_SAMPLES)].filter(Boolean)),
	];
	let error: string | null = null;
	let rows: { name: string; result: string }[] = [];
	try {
		const renamer = createRenamer(
			{ ...createDefaultOptions(), regex: options },
			window.api.platform,
		);
		const now = new Date();
		rows = names.map((name, index) => ({
			name,
			result: renamer(
				{
					path: name,
					dir: "",
					name,
					isDir: false,
					hidden: false,
					size: 0,
					mtimeMs: 0,
					birthtimeMs: 0,
				},
				{ index, folderIndex: index, now },
			),
		}));
	} catch (caught) {
		if (!(caught instanceof RenameConfigError)) throw caught;
		error = tr(caught.ref);
	}

	return (
		<section className="rx-preview">
			<TextField
				label={t("rxb.testName")}
				value={testName}
				placeholder={t("rxb.testPlaceholder")}
				onChange={setTestName}
			/>
			{error && <p className="rx-block-note error">{error}</p>}
			{!error && rows.length === 0 && <p className="rx-block-note">{t("rxb.noSamples")}</p>}
			{rows.length > 0 && (
				<table className="rx-preview-table">
					<thead>
						<tr>
							<th>{t("rxb.before")}</th>
							<th>{t("rxb.after")}</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.name} className={row.result !== row.name ? "changed" : undefined}>
								<td>{row.name}</td>
								<td>{row.result}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</section>
	);
}
