import { OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import { appendTemplateField, METADATA_TEMPLATE_FIELDS } from "@shared/rename";
import { useId } from "react";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

const PHOTO_FIELDS = METADATA_TEMPLATE_FIELDS.filter((field) => field.group === "photo");
const AUDIO_FIELDS = METADATA_TEMPLATE_FIELDS.filter((field) => field.group === "audio");

/** Nome montado com informações de dentro do arquivo (EXIF das fotos, tags das músicas). */
export function MetadataOptionsPanel({
	value,
	onChange,
	active,
	enabled,
	onToggle,
	onReset,
}: RenameSectionPanelProps<"metadata">) {
	const { t } = useI18n();
	const insertId = useId();
	const off = value.mode === "none";

	const insertField = (token: string) => {
		if (token) onChange({ template: appendTemplateField(value.template, token) });
	};

	return (
		<OptionPanel
			title={t("metadata.title")}
			active={active}
			enabled={enabled}
			onToggle={onToggle}
			onReset={onReset}
		>
			<div className="grid-2">
				<SelectField
					label={t("field.mode")}
					value={value.mode}
					options={[
						["none", t("option.none")],
						["replace", t("metadata.replace")],
						["prefix", t("option.prefix")],
						["suffix", t("option.suffix")],
					]}
					onChange={(mode) => onChange({ mode })}
				/>
				<TextField
					label={t("field.separator")}
					value={value.separator}
					disabled={value.mode !== "prefix" && value.mode !== "suffix"}
					onChange={(separator) => onChange({ separator })}
				/>
			</div>
			<TextField
				label={t("metadata.template")}
				mono
				value={value.template}
				title={t("metadata.templateHint")}
				disabled={off}
				onChange={(template) => onChange({ template })}
			/>
			<div className="field">
				<label htmlFor={insertId}>{t("metadata.insertField")}</label>
				{/* Volta sempre para o item vazio: é um menu de ações, não um valor. */}
				<select
					id={insertId}
					value=""
					disabled={off}
					onChange={(event) => insertField(event.target.value)}
				>
					<option value="">—</option>
					<optgroup label={t("metadata.photoFields")}>
						{PHOTO_FIELDS.map((field) => (
							<option key={field.name} value={field.token}>
								{t(`metadataField.${field.name}`)} {field.token}
							</option>
						))}
					</optgroup>
					<optgroup label={t("metadata.audioFields")}>
						{AUDIO_FIELDS.map((field) => (
							<option key={field.name} value={field.token}>
								{t(`metadataField.${field.name}`)} {field.token}
							</option>
						))}
					</optgroup>
				</select>
			</div>
			<div className="grid-2">
				<SelectField
					label={t("metadata.missing")}
					value={value.missing}
					options={[
						["error", t("metadata.missingError")],
						["fallback", t("metadata.missingFallback")],
					]}
					onChange={(missing) => onChange({ missing })}
				/>
				<TextField
					label={t("metadata.fallback")}
					value={value.fallback}
					disabled={off || value.missing !== "fallback"}
					onChange={(fallback) => onChange({ fallback })}
				/>
			</div>
		</OptionPanel>
	);
}
