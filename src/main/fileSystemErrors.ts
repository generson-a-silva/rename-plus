/** Mensagens legíveis para os erros mais comuns das operações de arquivo. */
const ERROR_MESSAGES: Record<string, string> = {
	EBUSY: "O item está em uso por outro programa",
	EPERM: "Sem permissão (o item pode estar em uso, protegido ou ser somente leitura)",
	EACCES: "Sem permissão para acessar o item",
	ENOSPC: "Não há espaço suficiente no disco",
	ENOENT: "O item não foi encontrado",
	ENAMETOOLONG: "O caminho ficou longo demais",
	EEXIST: "Já existe um item com esse nome",
	ENOTEMPTY: "Já existe uma pasta com esse nome",
	EROFS: "O disco é somente leitura",
};

/** Traduz um erro do Node (`EBUSY`, `EPERM`…) para uma mensagem em português. */
export function describeFileSystemError(error: unknown): string {
	const { code, message } = error as NodeJS.ErrnoException;
	return (code && ERROR_MESSAGES[code]) || message;
}
