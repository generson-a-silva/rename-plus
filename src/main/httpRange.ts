/** Faixa pedida em `Range: bytes=…` (só uma); `null` sem cabeçalho = arquivo inteiro. */
export function parseRange(
	header: string | null,
	size: number,
): { start: number; end: number } | "invalid" | null {
	if (!header) return null;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match || (!match[1] && !match[2])) return "invalid";
	const [, from = "", to = ""] = match;
	// "bytes=-500": os últimos 500 bytes.
	const start = from ? Number(from) : Math.max(0, size - Number(to));
	const end = from && to ? Math.min(Number(to), size - 1) : size - 1;
	return start > end || start >= size ? "invalid" : { start, end };
}
