import type { FileMetadata } from "../ipc";
import { sanitizeNamePart } from "./fileNameValidation";
import { RenameConfigError, RenameItemError } from "./renameErrors";
import type { MetadataOptions } from "./renameOptions";
import { formatDate } from "./textTransforms";

type Value = string | number | null;

/**
 * Como cada campo do modelo lê os metadados. `number` aceita `{campo:N}` (zeros à
 * esquerda até N dígitos) e `date` aceita `{date:formato}` com os tokens da Data automática.
 */
type FieldSpec =
	| { kind: "text"; read: (meta: FileMetadata) => string | null }
	| { kind: "number"; read: (meta: FileMetadata) => number | null }
	| { kind: "duration"; read: (meta: FileMetadata) => number | null }
	| { kind: "date"; read: (meta: FileMetadata) => number | null };

/** Marca e modelo sem repetir a marca ("Canon" + "Canon EOS 80D" → "Canon EOS 80D"). */
export function cameraName({ cameraMake: make, cameraModel: model }: FileMetadata): string | null {
	if (!make || !model) return model || make;
	return model.toLocaleLowerCase().startsWith(make.toLocaleLowerCase())
		? model
		: `${make} ${model}`;
}

const FIELDS = {
	date: { kind: "date", read: (meta) => meta.takenAt },
	camera: { kind: "text", read: cameraName },
	make: { kind: "text", read: (meta) => meta.cameraMake },
	model: { kind: "text", read: (meta) => meta.cameraModel },
	lens: { kind: "text", read: (meta) => meta.lens },
	iso: { kind: "number", read: (meta) => meta.iso },
	aperture: { kind: "number", read: (meta) => meta.aperture },
	focal: { kind: "number", read: (meta) => meta.focalLength },
	width: { kind: "number", read: (meta) => meta.width },
	height: { kind: "number", read: (meta) => meta.height },
	artist: { kind: "text", read: (meta) => meta.artist },
	albumartist: { kind: "text", read: (meta) => meta.albumArtist },
	album: { kind: "text", read: (meta) => meta.album },
	title: { kind: "text", read: (meta) => meta.title },
	track: { kind: "number", read: (meta) => meta.track },
	disc: { kind: "number", read: (meta) => meta.disc },
	year: { kind: "number", read: (meta) => meta.year },
	genre: { kind: "text", read: (meta) => meta.genre },
	duration: { kind: "duration", read: (meta) => meta.duration },
} satisfies Record<string, FieldSpec>;

export type MetadataFieldName = keyof typeof FIELDS;

/** Campos na ordem do menu "Inserir campo", com o modelo inserido por cada um. */
export const METADATA_TEMPLATE_FIELDS: readonly {
	name: MetadataFieldName;
	group: "photo" | "audio";
	token: string;
}[] = [
	{ name: "date", group: "photo", token: "{date:YYYY-MM-DD HH.mm.ss}" },
	{ name: "camera", group: "photo", token: "{camera}" },
	{ name: "make", group: "photo", token: "{make}" },
	{ name: "model", group: "photo", token: "{model}" },
	{ name: "lens", group: "photo", token: "{lens}" },
	{ name: "iso", group: "photo", token: "{iso}" },
	{ name: "aperture", group: "photo", token: "{aperture}" },
	{ name: "focal", group: "photo", token: "{focal}" },
	{ name: "width", group: "photo", token: "{width}" },
	{ name: "height", group: "photo", token: "{height}" },
	{ name: "artist", group: "audio", token: "{artist}" },
	{ name: "albumartist", group: "audio", token: "{albumartist}" },
	{ name: "album", group: "audio", token: "{album}" },
	{ name: "title", group: "audio", token: "{title}" },
	{ name: "track", group: "audio", token: "{track:2}" },
	{ name: "disc", group: "audio", token: "{disc}" },
	{ name: "year", group: "audio", token: "{year}" },
	{ name: "genre", group: "audio", token: "{genre}" },
	{ name: "duration", group: "audio", token: "{duration}" },
];

/** Acrescenta um campo ao fim do modelo, separado por espaço ("{artist}" + "{title}"). */
export function appendTemplateField(template: string, token: string): string {
	return template && !template.endsWith(" ") ? `${template} ${token}` : template + token;
}

/** Metadados sem nenhum campo (base para montar os de um arquivo). */
export function emptyMetadata(): FileMetadata {
	return {
		takenAt: null,
		cameraMake: null,
		cameraModel: null,
		lens: null,
		iso: null,
		aperture: null,
		focalLength: null,
		width: null,
		height: null,
		artist: null,
		albumArtist: null,
		album: null,
		title: null,
		track: null,
		disc: null,
		year: null,
		genre: null,
		duration: null,
	};
}

const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
/** Maior quantidade de dígitos aceita em `{campo:N}`. */
const MAX_PADDING = 10;
/** `{nome}` ou `{nome:argumento}`; chaves soltas e `{ nome }` ficam como texto. */
const FIELD_PATTERN = /\{([a-z]+)(?::([^{}]*))?\}/gi;

/** Até duas casas decimais, sem zeros sobrando (5.6, 4.25, 400). */
function formatDecimal(value: number): string {
	return String(Number(value.toFixed(2)));
}

/** 205 → "3m25s"; 3723 → "1h02m03s" (o `:` não pode ser usado em nomes no Windows). */
export function formatDuration(seconds: number): string {
	const total = Math.max(Math.round(seconds), 0);
	const pad = (n: number) => String(n).padStart(2, "0");
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return h > 0 ? `${h}h${pad(m)}m${pad(s)}s` : `${m}m${pad(s)}s`;
}

/** Função que lê o valor de um campo já validado, formatado para o nome. */
type FieldReader = (meta: FileMetadata) => string | null;

function compileField(token: string, name: string, arg: string | undefined): FieldReader {
	const spec: FieldSpec | undefined = FIELDS[name.toLowerCase() as MetadataFieldName];
	if (!spec) {
		throw new RenameConfigError({ key: "engine.unknownMetadataField", params: { field: token } });
	}
	const invalidArg = () =>
		new RenameConfigError({ key: "engine.invalidMetadataField", params: { field: token } });
	const text = (value: Value): string | null => {
		if (value === null) return null;
		const result = sanitizeNamePart(String(value)).trim();
		return result || null;
	};

	switch (spec.kind) {
		case "text":
		case "duration":
			if (arg !== undefined) throw invalidArg();
			return spec.kind === "text"
				? (meta) => text(spec.read(meta))
				: (meta) => {
						const value = spec.read(meta);
						return value === null ? null : formatDuration(value);
					};
		case "number": {
			if (arg !== undefined && !/^\d+$/.test(arg)) throw invalidArg();
			const padding = Math.min(Number(arg ?? 0), MAX_PADDING);
			return (meta) => {
				const value = spec.read(meta);
				return value === null ? null : formatDecimal(value).padStart(padding, "0");
			};
		}
		case "date": {
			const format = arg || DEFAULT_DATE_FORMAT;
			return (meta) => {
				const value = spec.read(meta);
				return value === null ? null : text(formatDate(new Date(value), format));
			};
		}
	}
}

/** Monta o texto do modelo para os metadados de um item (`null`: nada foi lido). */
export type MetadataTemplate = (
	metadata: FileMetadata | null,
	missing: Pick<MetadataOptions, "missing" | "fallback">,
) => string;

/**
 * Prepara um modelo como "{track:2} - {artist} - {title}" uma vez, para aplicá-lo a muitos
 * itens. Campo desconhecido ou argumento inválido lança `RenameConfigError`. Ao aplicar,
 * um campo vazio lança `RenameItemError` (modo `error`) ou vira o texto alternativo.
 */
export function compileMetadataTemplate(template: string): MetadataTemplate {
	const literals: string[] = [];
	const fields: { token: string; read: FieldReader }[] = [];
	let last = 0;
	for (const match of template.matchAll(FIELD_PATTERN)) {
		const [token, name = "", arg] = match;
		literals.push(template.slice(last, match.index));
		fields.push({ token, read: compileField(token, name, arg) });
		last = match.index + token.length;
	}
	literals.push(template.slice(last));

	return (metadata, { missing, fallback }) => {
		let result = literals[0] ?? "";
		fields.forEach((field, index) => {
			const value = metadata ? field.read(metadata) : null;
			// Só "fallback" troca o erro pelo texto: um valor inválido vindo do disco fica no seguro.
			if (value === null && missing !== "fallback") {
				throw new RenameItemError({
					key: "engine.missingMetadata",
					params: { field: field.token },
				});
			}
			result += (value ?? fallback) + (literals[index + 1] ?? "");
		});
		return result;
	};
}
