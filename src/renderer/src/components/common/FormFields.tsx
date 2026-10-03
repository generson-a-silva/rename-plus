import { useEffect, useId, useState } from "react";

interface TextFieldProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	title?: string;
	disabled?: boolean;
	mono?: boolean;
}

export function TextField({ label, value, onChange, mono, ...rest }: TextFieldProps) {
	const id = useId();
	return (
		<div className="field">
			<label htmlFor={id}>{label}</label>
			<input
				id={id}
				type="text"
				className={mono ? "mono" : undefined}
				value={value}
				spellCheck={false}
				onChange={(event) => onChange(event.target.value)}
				{...rest}
			/>
		</div>
	);
}

interface NumberFieldProps {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	title?: string;
	disabled?: boolean;
}

/** Campo numérico que aceita rascunhos como "" ou "-" enquanto o usuário digita. */
export function NumberField({
	label,
	value,
	onChange,
	min,
	max,
	title,
	disabled,
}: NumberFieldProps) {
	const id = useId();
	const [draft, setDraft] = useState(String(value));

	useEffect(() => {
		setDraft((current) => (Number(current) === value && current !== "" ? current : String(value)));
	}, [value]);

	return (
		<div className="field">
			<label htmlFor={id}>{label}</label>
			<input
				id={id}
				type="number"
				className="number"
				value={draft}
				min={min}
				max={max}
				title={title}
				disabled={disabled}
				onChange={(event) => {
					const text = event.target.value;
					setDraft(text);
					const parsed = Number(text);
					if (text.trim() !== "" && Number.isFinite(parsed)) {
						const clamped = Math.min(
							max ?? Infinity,
							Math.max(min ?? -Infinity, Math.trunc(parsed)),
						);
						onChange(clamped);
					}
				}}
				onBlur={() => setDraft(String(value))}
			/>
		</div>
	);
}

interface CheckFieldProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	title?: string;
	disabled?: boolean;
}

export function CheckField({ label, checked, onChange, title, disabled }: CheckFieldProps) {
	return (
		<label className="check" title={title}>
			<input
				type="checkbox"
				checked={checked}
				disabled={disabled}
				onChange={(event) => onChange(event.target.checked)}
			/>
			{label}
		</label>
	);
}

interface SelectFieldProps<T extends string> {
	label: string;
	value: T;
	options: readonly (readonly [T, string])[];
	onChange: (value: T) => void;
	title?: string;
}

export function SelectField<T extends string>({
	label,
	value,
	options,
	onChange,
	title,
}: SelectFieldProps<T>) {
	const id = useId();
	return (
		<div className="field">
			<label htmlFor={id}>{label}</label>
			<select
				id={id}
				value={value}
				title={title}
				onChange={(event) => onChange(event.target.value as T)}
			>
				{options.map(([optionValue, optionLabel]) => (
					<option key={optionValue} value={optionValue}>
						{optionLabel}
					</option>
				))}
			</select>
		</div>
	);
}
