export interface NameDiffSegment {
	text: string;
	changed: boolean;
}

export interface NameDiff {
	/** Nome atual, com as partes removidas ou trocadas marcadas. */
	before: NameDiffSegment[];
	/** Novo nome, com as partes inseridas ou trocadas marcadas. */
	after: NameDiffSegment[];
}

/** Acima disso (nomes enormes), marca o miolo inteiro em vez de calcular a LCS. */
const MAX_LCS_CELLS = 250_000;

/**
 * Diferença por caractere entre o nome atual e o novo, para destacar o que muda na
 * lista. Usa a maior subsequência comum (LCS) depois de separar prefixo e sufixo
 * iguais; compara por code point, então acentos e emojis não são partidos ao meio.
 */
export function diffNames(before: string, after: string): NameDiff {
	const a = Array.from(before);
	const b = Array.from(after);
	let start = 0;
	while (start < a.length && start < b.length && a[start] === b[start]) start++;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
		endA--;
		endB--;
	}

	const beforeFlags = a.map(() => false);
	const afterFlags = b.map(() => false);
	const midA = endA - start;
	const midB = endB - start;
	if (midA * midB > MAX_LCS_CELLS) {
		beforeFlags.fill(true, start, endA);
		afterFlags.fill(true, start, endB);
	} else {
		// lengths[i][j] = LCS de a[start+i..endA) e b[start+j..endB).
		const width = midB + 1;
		const lengths = new Uint16Array((midA + 1) * width);
		for (let i = midA - 1; i >= 0; i--) {
			for (let j = midB - 1; j >= 0; j--) {
				lengths[i * width + j] =
					a[start + i] === b[start + j]
						? (lengths[(i + 1) * width + j + 1] ?? 0) + 1
						: Math.max(lengths[(i + 1) * width + j] ?? 0, lengths[i * width + j + 1] ?? 0);
			}
		}
		let i = 0;
		let j = 0;
		while (i < midA || j < midB) {
			if (i < midA && j < midB && a[start + i] === b[start + j]) {
				i++;
				j++;
			} else if (
				j >= midB ||
				(i < midA && (lengths[(i + 1) * width + j] ?? 0) >= (lengths[i * width + j + 1] ?? 0))
			) {
				beforeFlags[start + i] = true;
				i++;
			} else {
				afterFlags[start + j] = true;
				j++;
			}
		}
	}
	return { before: toSegments(a, beforeFlags), after: toSegments(b, afterFlags) };
}

/** Junta caracteres vizinhos com a mesma marcação em trechos. */
function toSegments(chars: readonly string[], flags: readonly boolean[]): NameDiffSegment[] {
	const segments: NameDiffSegment[] = [];
	chars.forEach((char, index) => {
		const changed = flags[index] ?? false;
		const last = segments.at(-1);
		if (last && last.changed === changed) last.text += char;
		else segments.push({ text: char, changed });
	});
	return segments;
}
