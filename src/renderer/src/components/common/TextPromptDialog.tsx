import type { TextPromptRequest } from "@hooks";
import { splitName } from "@shared/rename";
import { useEffect, useId, useRef, useState } from "react";

interface TextPromptDialogProps {
	request: TextPromptRequest | null;
	onClose: (value: string | null) => void;
}

/** Diálogo modal com um campo de texto (nova pasta, renomear item). */
export function TextPromptDialog({ request, onClose }: TextPromptDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState("");
	const inputId = useId();
	const errorId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (!request) {
			if (dialog.open) dialog.close();
			return;
		}
		setValue(request.initialValue);
		if (!dialog.open) dialog.showModal();
		const input = inputRef.current;
		if (input) {
			input.value = request.initialValue;
			const end = request.selectBaseName
				? splitName(request.initialValue, false).base.length
				: request.initialValue.length;
			input.focus();
			input.setSelectionRange(0, end);
		}
	}, [request]);

	const error = request?.validate?.(value) ?? null;
	const unchanged = request?.requireChange === true && value === request.initialValue;

	return (
		<dialog
			ref={dialogRef}
			className="prompt-dialog"
			aria-labelledby={`${inputId}-title`}
			onCancel={(event) => {
				event.preventDefault();
				onClose(null);
			}}
		>
			{request && (
				<form
					method="dialog"
					onSubmit={(event) => {
						event.preventDefault();
						if (!error && !unchanged) onClose(value);
					}}
				>
					<h2 id={`${inputId}-title`}>{request.title}</h2>
					<label htmlFor={inputId}>{request.label}</label>
					<input
						ref={inputRef}
						id={inputId}
						type="text"
						spellCheck={false}
						value={value}
						aria-invalid={error !== null}
						aria-describedby={errorId}
						onChange={(event) => setValue(event.target.value)}
					/>
					<p id={errorId} className="prompt-error" role="alert">
						{error ?? " "}
					</p>
					<div className="prompt-actions">
						<button type="button" className="button" onClick={() => onClose(null)}>
							Cancelar
						</button>
						<button type="submit" className="button primary" disabled={error !== null || unchanged}>
							{request.confirmLabel}
						</button>
					</div>
				</form>
			)}
		</dialog>
	);
}
