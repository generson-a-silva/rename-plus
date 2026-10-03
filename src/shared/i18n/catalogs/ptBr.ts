import type { Message } from "../messageTypes";

/**
 * Catálogo de referência (português do Brasil). Define todas as chaves: os demais
 * idiomas precisam ter exatamente as mesmas (o TypeScript acusa se faltar alguma).
 *
 * Mensagens com `{ one, other }` usam o parâmetro `count`; `{nome}` é interpolado.
 */
export const ptBr = {
	// ---- Geral ----------------------------------------------------------
	"common.cancel": "Cancelar",
	"common.confirm": "Confirmar",

	// ---- Idioma ---------------------------------------------------------
	"language.button": "Idioma: {language}",
	"language.menu": "Idioma da interface",

	// ---- Árvore e raízes ------------------------------------------------
	"roots.home": "Pasta pessoal",
	"roots.filesystem": "Sistema de arquivos",
	"roots.drive": "Unidade {drive}",
	"tree.label": "Pastas",
	"tree.expand": "Expandir",
	"tree.collapse": "Recolher",
	"tree.loading": "Carregando…",

	// ---- Barra superior -------------------------------------------------
	"toolbar.up": "Pasta acima",
	"toolbar.home": "Pasta pessoal",
	"toolbar.refresh": "Atualizar (F5)",
	"toolbar.openFolder": "Abrir pasta…",
	"toolbar.path": "Caminho da pasta",
	"toolbar.selectAll": "Selecionar tudo (Ctrl+A)",
	"toolbar.selectNone": "Limpar seleção (Esc)",
	"toolbar.invert": "Inverter seleção",
	"toolbar.showHidden": "Mostrar itens ocultos (Ctrl+H)",
	"toolbar.hideHidden": "Ocultar itens ocultos (Ctrl+H)",
	"toolbar.themeSystem": "Tema: sistema (clique para claro)",
	"toolbar.themeLight": "Tema: claro (clique para escuro)",
	"toolbar.themeDark": "Tema: escuro (clique para seguir o sistema)",

	// ---- Lista de arquivos ----------------------------------------------
	"list.label": "Arquivos",
	"list.loading": "Carregando…",
	"list.empty": "Nenhum item nesta pasta.",
	"list.error": "Erro ao listar: {detail}",
	"columns.name": "Nome",
	"columns.newName": "Novo nome",
	"columns.size": "Tamanho",
	"columns.type": "Tipo",
	"columns.modified": "Modificado",
	"columns.folder": "Pasta",
	"columns.resizeLabel": "Largura da coluna {column}",
	"columns.resizeHint": "Arraste para ajustar a largura · duplo clique para ajustar ao conteúdo",
	"fileType.folder": "Pasta",
	"fileType.file": "Arquivo",

	// ---- Barra de status ------------------------------------------------
	"status.items": { one: "{count} item", other: "{count} itens" },
	"status.selected": { one: "{count} selecionado", other: "{count} selecionados" },
	"status.willRename": { one: "{count} será renomeado", other: "{count} serão renomeados" },
	"status.conflicts": { one: "{count} conflito", other: "{count} conflitos" },
	"status.truncated": "Listagem limitada a {count} itens",
	"status.developedBy": "Desenvolvido por {author}",

	// ---- Layout ---------------------------------------------------------
	"layout.panelsSplitter": "Arraste para redimensionar (até metade da área)",

	// ---- Opções comuns dos painéis -------------------------------------
	"panel.reset": "Redefinir seção",
	"field.mode": "Modo",
	"field.find": "Buscar",
	"field.separator": "Separador",
	"field.insertAt": "Na posição",
	"option.none": "Nenhum",
	"option.keep": "Manter",
	"option.remove": "Remover",
	"option.prefix": "Prefixo",
	"option.suffix": "Sufixo",
	"option.lowercase": "minúsculas",
	"option.uppercase": "MAIÚSCULAS",
	"option.titleCase": "Título",

	// ---- (RegEx) -------------------------------------------------------
	"regex.title": "RegEx",
	"regex.findPlaceholder": "ex.: IMG_(\\d+)",
	"regex.replace": "Substituir",
	"regex.replacePlaceholder": "ex.: Foto $1",
	"regex.replaceHint": "Use $1, $2… para grupos de captura e $& para o trecho encontrado.",
	"regex.includeExt": "Incl. ext.",
	"regex.global": "Global",
	"regex.globalHint": "Substitui todas as ocorrências, não só a primeira.",
	"regex.ignoreCase": "Ignorar maiúsc.",

	// ---- Nome -----------------------------------------------------------
	"name.title": "Nome",
	"name.field": "Nome",
	"name.fixed": "Fixo",
	"name.reverse": "Inverter",

	// ---- Substituir -----------------------------------------------------
	"replace.title": "Substituir",
	"replace.with": "Por",
	"replace.matchCase": "Diferenciar maiúsculas",

	// ---- Maiúsculas/minúsculas -----------------------------------------
	"case.title": "Maiúsc./Minúsc.",
	"case.field": "Caixa",
	"case.sentence": "Frase",
	"case.exceptions": "Exceções",
	"case.exceptionsPlaceholder": "de;da;do;e",
	"case.exceptionsHint": "Palavras separadas por ; que ficam exatamente como escritas.",

	// ---- Remover --------------------------------------------------------
	"remove.title": "Remover",
	"remove.first": "Primeiros",
	"remove.last": "Últimos",
	"remove.from": "De",
	"remove.fromHint": "Posição inicial (a partir de 1) do trecho a remover.",
	"remove.to": "Até",
	"remove.toHint": "Posição final (inclusive) do trecho a remover.",
	"remove.chars": "Caracteres",
	"remove.charsHint": "Remove cada um destes caracteres.",
	"remove.words": "Palavras",
	"remove.wordsHint": "Palavras inteiras separadas por espaço.",
	"remove.crop": "Cortar",
	"remove.cropNone": "Não",
	"remove.cropBefore": "Antes de",
	"remove.cropAfter": "Depois de",
	"remove.cropText": "Texto",
	"remove.digits": "Dígitos",
	"remove.accents": "Acentos",
	"remove.symbols": "Símbolos",
	"remove.symbolsHint": "Tudo que não é letra, número ou espaço.",
	"remove.high": "Não-ASCII",
	"remove.trim": "Aparar",
	"remove.trimHint": "Remove espaços no início e no fim.",
	"remove.doubleSpaces": "Espaços duplos",
	"remove.leadDots": "Pontos iniciais",

	// ---- Adicionar ------------------------------------------------------
	"add.title": "Adicionar",
	"add.insert": "Inserir",
	"add.insertAtHint": "Quantidade de caracteres antes do texto; negativo conta do fim.",
	"add.wordSpace": "Espaço entre palavras",
	"add.wordSpaceHint": 'Separa palavras coladas: "MinhaFoto" → "Minha Foto".',

	// ---- Data automática ------------------------------------------------
	"autoDate.title": "Data automática",
	"autoDate.type": "Tipo",
	"autoDate.modified": "Modificação",
	"autoDate.created": "Criação",
	"autoDate.current": "Atual",
	"autoDate.format": "Formato",
	"autoDate.formatHint": "Tokens: YYYY, YY, MM, DD, HH, mm, ss",

	// ---- Nome da pasta --------------------------------------------------
	"appendFolder.title": "Nome da pasta",
	"appendFolder.levels": "Níveis",

	// ---- Numeração ------------------------------------------------------
	"numbering.title": "Numeração",
	"numbering.both": "Pref. + Suf.",
	"numbering.insert": "Inserir",
	"numbering.start": "Início",
	"numbering.increment": "Incremento",
	"numbering.padding": "Dígitos",
	"numbering.paddingHint": "Completa com zeros à esquerda (0 = sem preenchimento).",
	"numbering.style": "Estilo",
	"numbering.resetPerFolder": "Reiniciar em cada pasta",

	// ---- Extensão -------------------------------------------------------
	"extension.title": "Extensão",
	"extension.field": "Extensão",
	"extension.fixed": "Fixa",
	"extension.extra": "Adicional",
	"extension.value": "Valor",
	"extension.valuePlaceholder": "ex.: jpg",

	// ---- Filtros --------------------------------------------------------
	"filters.title": "Filtros",
	"filters.mask": "Máscara",
	"filters.maskHint": "Curingas * e ?; várias máscaras separadas por ;",
	"filters.files": "Arquivos",
	"filters.folders": "Pastas",
	"filters.hidden": "Ocultos",
	"filters.subfolders": "Subpastas",
	"filters.subfoldersHint": "Lista também o conteúdo das subpastas (recursivo).",

	// ---- Ações e pré-visualização --------------------------------------
	"actions.label": "Ações de renomeação",
	"actions.rename": "Renomear",
	"actions.undo": "Desfazer",
	"actions.reset": "Redefinir",
	"actions.resetHint": "Redefinir todas as seções",
	"preview.selectItems": "Selecione itens na lista para ver a pré-visualização.",
	"preview.willRename": {
		one: "{count} item será renomeado.",
		other: "{count} itens serão renomeados.",
	},
	"preview.nothingToChange": "Nenhum nome seria alterado.",
	"preview.conflicts": {
		one: "{count} conflito — passe o mouse sobre a linha para ver o motivo.",
		other: "{count} conflitos — passe o mouse sobre as linhas para ver o motivo.",
	},
	"preview.duplicate": "Nome duplicado no lote",
	"preview.exists": "Já existe um item com esse nome",

	// ---- Renomear / desfazer -------------------------------------------
	"rename.fixConflicts": {
		one: "Corrija {count} conflito antes de renomear (destacado em vermelho).",
		other: "Corrija {count} conflitos antes de renomear (destacados em vermelho).",
	},
	"rename.confirm": { one: "Renomear {count} item?", other: "Renomear {count} itens?" },
	"rename.confirmMore": "… e mais {count}",
	"rename.done": { one: "{count} item renomeado.", other: "{count} itens renomeados." },
	"rename.failedNothing": "Nada foi renomeado.",
	"rename.failedItem": "Nada foi renomeado — {name}: {error}",
	"undo.confirm": "Desfazer a última renomeação?",
	"undo.done": { one: "{count} item restaurado.", other: "{count} itens restaurados." },
	"navigation.notFound": "Pasta não encontrada: {path}",
	"drop.title": "Solte para abrir",
	"drop.hint": "Pastas abrem diretamente; arquivos abrem a pasta onde estão, já selecionados.",
	"drop.failed": "Não foi possível abrir o item arrastado.",

	// ---- Menus de contexto ----------------------------------------------
	"menu.open": "Abrir",
	"menu.openFolder": "Abrir pasta",
	"menu.showInFolder": "Mostrar no gerenciador de arquivos",
	"menu.openInFileManager": "Abrir no gerenciador de arquivos",
	"menu.rename": "Renomear…",
	"menu.cut": { one: "Recortar", other: "Recortar {count} itens" },
	"menu.copy": { one: "Copiar", other: "Copiar {count} itens" },
	"menu.paste": "Colar",
	"menu.pasteHere": "Colar aqui",
	"menu.copyPath": { one: "Copiar caminho", other: "Copiar caminhos" },
	"menu.trash": { one: "Mover para a lixeira", other: "Mover {count} itens para a lixeira" },
	"menu.newFolder": "Nova pasta…",
	"menu.newSubfolder": "Nova subpasta…",
	"menu.selectAll": "Selecionar tudo",
	"menu.refresh": "Atualizar",
	"menu.showHidden": "Mostrar itens ocultos",

	// ---- Operações de arquivo -------------------------------------------
	"ops.moreErrors": { one: " (e mais {count} erro)", other: " (e mais {count} erros)" },
	"ops.openFailed": "Não foi possível abrir {name}: {error}",
	"ops.pathCopied": { one: "Caminho copiado.", other: "{count} caminhos copiados." },
	"ops.copiedToClipboard": {
		one: "{count} item copiado — use Colar na pasta de destino.",
		other: "{count} itens copiados — use Colar na pasta de destino.",
	},
	"ops.cutToClipboard": {
		one: "{count} item recortado — use Colar na pasta de destino.",
		other: "{count} itens recortados — use Colar na pasta de destino.",
	},
	"ops.pasteNothing": "Nada a colar: os itens já estão nesta pasta.",
	"ops.pasted": { one: "{count} item colado.", other: "{count} itens colados." },
	"ops.moved": { one: "{count} item movido.", other: "{count} itens movidos." },
	"ops.pasteFailed": "Falha ao colar — {detail}",
	"ops.trashConfirmOne": 'Mover "{name}" para a lixeira?',
	"ops.trashConfirmMany": "Mover {count} itens para a lixeira?",
	"ops.trashDetail": "Os itens podem ser restaurados pela lixeira do sistema.",
	"ops.trashButton": "Mover para a lixeira",
	"ops.noTrashOne": '"{name}" não pode ir para a lixeira. Excluir permanentemente?',
	"ops.noTrashMany": "{count} itens não podem ir para a lixeira. Excluir permanentemente?",
	"ops.noTrashDetail": "Este disco não tem lixeira. A exclusão não poderá ser desfeita.",
	"ops.deleteButton": "Excluir permanentemente",
	"ops.deleteCancelled": "Exclusão cancelada",
	"ops.removed": { one: "{count} item removido.", other: "{count} itens removidos." },
	"ops.removeFailed": "Falha ao remover — {detail}",
	"ops.newFolderTitle": "Nova pasta",
	"ops.newFolderLabel": "Nome da pasta em {folder}",
	"ops.newFolderDefault": "Nova pasta",
	"ops.create": "Criar",
	"ops.createFailed": "Não foi possível criar a pasta — {detail}",
	"ops.created": 'Pasta "{name}" criada.',
	"ops.renameFolderTitle": "Renomear pasta",
	"ops.renameFileTitle": "Renomear arquivo",
	"ops.newName": "Novo nome",
	"ops.unknownError": "erro desconhecido",
	"ops.renameFailed": "Não foi possível renomear {name}: {error}",
	"ops.renamed": '"{from}" renomeado para "{to}".',

	// ---- Validação de nomes ---------------------------------------------
	"validation.empty": "Nome vazio",
	"validation.reserved": "Nome reservado",
	"validation.slash": 'Contém o caractere "/"',
	"validation.nul": "Contém caractere nulo",
	"validation.tooManyBytes": "Excede {max} bytes",
	"validation.windowsChar": "Caractere não permitido no Windows: {char}",
	"validation.control": "Contém caractere de controle",
	"validation.windowsReserved": "Nome reservado pelo Windows",
	"validation.trailingDotSpace": "Não pode terminar com ponto ou espaço",
	"validation.tooManyChars": "Excede {max} caracteres",
	"engine.invalidRegex": "RegEx inválida: {detail}",

	// ---- Erros do sistema de arquivos (processo principal) ------------
	"fs.EBUSY": "O item está em uso por outro programa",
	"fs.EPERM": "Sem permissão (o item pode estar em uso, protegido ou ser somente leitura)",
	"fs.EACCES": "Sem permissão para acessar o item",
	"fs.ENOSPC": "Não há espaço suficiente no disco",
	"fs.ENOENT": "O item não foi encontrado",
	"fs.ENAMETOOLONG": "O caminho ficou longo demais",
	"fs.EEXIST": "Já existe um item com esse nome",
	"fs.ENOTEMPTY": "Já existe uma pasta com esse nome",
	"fs.EROFS": "O disco é somente leitura",
	"batch.notAbsolute": "Caminho não absoluto",
	"batch.otherFolder": "O destino deve ficar na mesma pasta",
	"batch.repeated": "Item repetido no lote",
	"batch.sourceMissing": "O item original não existe mais",
	"batch.rollbackFailed": "{error}. Falha ao desfazer: {details}",
	"transfer.copyIntoItself": "Não é possível copiar uma pasta para dentro dela mesma",
	"transfer.moveIntoItself": "Não é possível mover uma pasta para dentro dela mesma",
	"trash.unavailable": "A lixeira não está disponível neste disco",
} as const satisfies Record<string, Message>;
