/** Limite de bytes de um nome de arquivo na maioria dos sistemas de arquivos Linux. */
export const MAX_NAME_BYTES = 255;

const encoder = new TextEncoder();

/** Retorna uma mensagem de erro se `name` não puder ser usado como nome de arquivo no Linux. */
export function validateFileName(name: string): string | null {
	if (!name) return "Nome vazio";
	if (name === "." || name === "..") return "Nome reservado";
	if (name.includes("/")) return 'Contém o caractere "/"';
	if (name.includes("\0")) return "Contém caractere nulo";
	if (encoder.encode(name).length > MAX_NAME_BYTES) return `Excede ${MAX_NAME_BYTES} bytes`;
	return null;
}
