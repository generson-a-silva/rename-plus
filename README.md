<p align="center">
  <img src="resources/icon.png" alt="Ícone do Rename Plus" width="128" height="128">
</p>

<h1 align="center">Rename Plus</h1>

<p align="center">
  Renomeador de arquivos e pastas em lote, com pré-visualização ao vivo, para Linux e Windows.
</p>

<p align="center">
  <img alt="Versão 1.2.0" src="https://img.shields.io/badge/vers%C3%A3o-1.2.0-2f6fe4">
  <img alt="Linux" src="https://img.shields.io/badge/Linux-suportado-1a7f37?logo=linux&logoColor=white">
  <img alt="Windows" src="https://img.shields.io/badge/Windows-suportado-1a7f37?logo=windows&logoColor=white">
  <img alt="macOS" src="https://img.shields.io/badge/macOS-planejado-8d96a0?logo=apple&logoColor=white">
  <img alt="Idiomas" src="https://img.shields.io/badge/idiomas-PT%20%C2%B7%20EN%20%C2%B7%20ES-2f6fe4">
</p>

<p align="center">
  <img src="docs/screenshot.png" alt="Tela do Rename Plus: árvore de pastas à esquerda, lista de fotos com os novos nomes em verde à direita e os painéis de regras embaixo" width="900">
</p>

---

## Sumário

- [Sobre](#sobre)
- [Inspiração e créditos](#inspiração-e-créditos)
- [Funcionalidades](#funcionalidades)
- [Como as regras são aplicadas](#como-as-regras-são-aplicadas)
- [O que o Rename Plus não faz](#o-que-o-rename-plus-não-faz)
- [Plataformas suportadas](#plataformas-suportadas)
- [Instalação](#instalação)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Desenvolvimento](#desenvolvimento)
- [Onde ficam as preferências](#onde-ficam-as-preferências)
- [Autor](#autor)

## Sobre

O **Rename Plus** renomeia muitos arquivos e pastas de uma vez a partir de regras combináveis: expressão regular, substituição de texto, maiúsculas/minúsculas, remoção de trechos, prefixos e sufixos, data, nome da pasta, numeração e extensão.

Antes de qualquer alteração no disco, a coluna **Novo nome** mostra o resultado de cada item selecionado. Conflitos, como dois arquivos com o mesmo nome final ou caracteres proibidos pelo sistema, aparecem em vermelho e bloqueiam a operação. Depois de renomear, é possível **desfazer** o último lote.

A interface segue o modelo de três áreas: árvore de pastas à esquerda, lista de arquivos à direita e painéis de regras embaixo, com os botões **Renomear**, **Desfazer** e **Redefinir** sempre visíveis.

## Inspiração e créditos

O Rename Plus é inspirado no **[Bulk Rename Utility](https://github.com/BulkRenameUtility/download)**, um renomeador em lote para Windows de código fechado. A organização dos painéis numerados e a ordem em que as regras são aplicadas seguem o modelo consagrado por ele.

O Rename Plus é um projeto independente, escrito do zero:

- **não usa código** do Bulk Rename Utility;
- **não é afiliado** aos seus autores nem endossado por eles;
- **não é um substituto completo:** veja [o que o Rename Plus não faz](#o-que-o-rename-plus-não-faz).

Se você usa Windows e precisa de recursos avançados como metadados EXIF/ID3, scripts em JavaScript ou importação de CSV, conheça o Bulk Rename Utility.

## Funcionalidades

### Regras de renomeação

| Painel | O que faz |
|---|---|
| **RegEx** | Buscar e substituir com expressões regulares, com grupos de captura (`$1`, `$2`…), opção de incluir a extensão, substituição global e sem diferenciar maiúsculas. |
| **Nome** | Manter, remover, trocar por um nome fixo ou inverter o nome original. |
| **Substituir** | Substituição de texto literal, com ou sem diferenciar maiúsculas. |
| **Maiúsc./Minúsc.** | minúsculas, MAIÚSCULAS, Título e Frase, com lista de palavras de exceção. |
| **Remover** | Primeiros/últimos N caracteres, intervalo por posição, caracteres e palavras específicos, cortar antes/depois de um texto, dígitos, acentos, símbolos, caracteres não ASCII, espaços duplos, espaços nas pontas e pontos iniciais. |
| **Adicionar** | Prefixo, sufixo, inserção em uma posição (negativa conta do fim) e separação de palavras coladas (`MinhaFoto` → `Minha Foto`). |
| **Data automática** | Data de modificação, criação ou atual, como prefixo ou sufixo, em formato livre (`YYYY-MM-DD`, `DD.MM.YY`…). |
| **Nome da pasta** | Acrescenta o nome de uma ou mais pastas ancestrais. |
| **Numeração** | Prefixo, sufixo, ambos ou em uma posição; início, incremento, zeros à esquerda; estilos `1, 2, 3`, `a, b, c`, `A, B, C` e `I, II, III`; reinício por pasta. |
| **Extensão** | Manter, minúsculas, MAIÚSCULAS, Título, remover, trocar por uma fixa ou acrescentar uma extra. |
| **Filtros** | Máscara de nomes (`*.jpg; *.png`), arquivos e/ou pastas, itens ocultos e conteúdo das subpastas (modo recursivo). |

### Pré-visualização e segurança

- **Pré-visualização ao vivo:** o novo nome é calculado enquanto você digita, e só para os itens selecionados.
- **Detecção de conflitos:** nomes duplicados no lote, colisão com arquivos existentes e nomes inválidos no sistema. Exemplos: `/` no Linux; `< > : " \ | ? *`, `CON`, `NUL` e ponto ou espaço no final no Windows. O motivo aparece ao passar o mouse sobre a linha.
- **Renomeação "tudo ou nada":** o lote é validado antes de tocar no disco e executado em duas etapas, o que permite trocar nomes entre arquivos (`a ↔ b`). Se algo falhar no meio, o que já foi renomeado volta ao nome original.
- **Nunca sobrescreve** arquivos existentes, inclusive ao copiar ou mover (nomes repetidos ganham sufixo ` (2)`, ` (3)`…).
- **Desfazer** o último lote de renomeação, inclusive renomeações feitas pelo menu de contexto.

### Navegação e seleção

- Árvore de pastas com carregamento sob demanda, com a pasta pessoal e as raízes do sistema (`/` no Linux, unidades `C:`, `D:`… no Windows).
- Lista de arquivos rápida mesmo em pastas grandes (renderiza só as linhas visíveis), com ordenação por coluna e colunas redimensionáveis (duplo clique na divisória ajusta ao conteúdo).
- Seleção como num gerenciador de arquivos: clique, Ctrl/Shift+clique, **arrastar para selecionar** um retângulo com rolagem automática, e clique na área livre para limpar.
- Itens ocultos ficam escondidos por padrão e podem ser exibidos (aparecem esmaecidos).

### Operações de arquivo (menu de contexto)

Botão direito na lista ou na árvore para abrir com o aplicativo padrão, mostrar no gerenciador de arquivos, renomear um item, recortar, copiar e colar, copiar o caminho, criar pasta e mover para a lixeira. Em discos sem lixeira, o app oferece excluir definitivamente, com confirmação.

### Interface

- Tema **claro**, **escuro** ou **seguindo o sistema**.
- Idiomas **português**, **inglês** e **espanhol**, escolhidos pelo botão no canto inferior direito da área de ações. O idioma inicial segue o sistema.
- Layout ajustável: largura da árvore, altura da área de regras (até metade da janela) e largura das colunas.
- A janela lembra tamanho, posição e se estava maximizada. Na primeira execução abre maximizada.

## Como as regras são aplicadas

As regras são aplicadas sempre nesta ordem, uma sobre o resultado da anterior:

```
RegEx → Nome → Substituir → Maiúsc./Minúsc. → Remover → Adicionar
      → Data automática → Nome da pasta → Numeração → Extensão
```

Exemplo do print acima: `IMG_2041.JPG` → RegEx troca `IMG_2041` por `Lisboa` → Data automática acrescenta `2024-06-10 ` → Numeração acrescenta ` - 01` → Extensão em minúsculas → **`2024-06-10 Lisboa - 01.jpg`**.

Em pastas, o ponto **não** é tratado como separador de extensão (`v1.2` continua sendo o nome inteiro), e o mesmo vale para arquivos ocultos como `.bashrc`.

## O que o Rename Plus não faz

Para deixar claro o escopo atual:

- **Não lê metadados de arquivos:** não usa EXIF de fotos, ID3 de músicas nem propriedades de documentos para montar nomes.
- **Não executa scripts** (ex.: JavaScript) nem importa listas de nomes de arquivos CSV.
- **Não move nem copia partes do nome** de uma posição para outra (o painel "Mover/Copiar" do Bulk Rename Utility).
- **Não altera datas, atributos nem permissões** dos arquivos; só os nomes.
- **Não move arquivos para outra pasta ao renomear:** o novo nome fica sempre na mesma pasta. Para mover, use recortar e colar.
- **Não tem modo de linha de comando** nem agendamento.
- **O "Desfazer" vale só para o último lote** e só enquanto o app está aberto.
- **Limite de listagem:** mostra até 50.000 itens por vez; acima disso a lista é truncada, com aviso.
- **Não roda no macOS** por enquanto.

## Plataformas suportadas

| Sistema | Situação | Pacote | Observações |
|---|---|---|---|
| **Linux** (x64) | ✅ Suportado e testado | AppImage | Testado no KDE Plasma (Wayland). No Wayland, o sistema decide em qual monitor a janela abre, então o app restaura o tamanho da janela, mas não a posição. |
| **Windows** (x64) | ✅ Suportado | Instalador NSIS | Instala para todos os usuários (pede permissão de administrador) e cria o atalho "Rename Plus" na área de trabalho e no Menu Iniciar. Ainda em validação em máquinas reais. |
| **macOS** | 🕓 Planejado | — | Ainda não suportado. |

## Instalação

### Linux (AppImage)

1. Gere o pacote (veja [Desenvolvimento](#desenvolvimento)) ou use um AppImage já gerado: `rename-plus-<versão>-linux-x86_64.AppImage`.
2. Dê permissão de execução e abra:

   ```bash
   chmod +x rename-plus-*.AppImage
   ./rename-plus-*.AppImage
   ```

3. **Opcional:** integre ao menu de aplicativos com o [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) ou outra ferramenta de integração de AppImage.

### Windows

Execute o instalador `rename-plus-<versão>-win-x64.exe` e siga as etapas. O app aparece em "Aplicativos instalados" com o editor **Generson Silva** e pode ser desinstalado por lá.

## Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+A` | Selecionar todos os itens da lista |
| `Esc` | Limpar a seleção |
| `F2` | Renomear o item selecionado |
| `Delete` | Mover para a lixeira |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copiar / recortar / colar |
| `Ctrl+Shift+N` | Nova pasta |
| `Ctrl+H` | Mostrar/ocultar itens ocultos |
| `F5` | Atualizar |
| `↑` `↓` `PgUp` `PgDn` `Home` `End` | Navegar pela lista (com `Shift` para estender a seleção) |
| `Enter` / duplo clique | Abrir pasta ou arquivo |

## Desenvolvimento

**Tecnologias:** Electron, React, TypeScript, Vite, Vitest, Biome (lint e formatação) e electron-builder.

**Requisitos:** Node.js 22.12 ou superior e npm.

```bash
npm install          # instala as dependências
npm run dev          # Vite + Electron com recarga automática
npm test             # testes (Vitest)
npm run ci           # lint (Biome) + checagem de tipos + testes
npm run build        # compila para build-react/ e build-electron/
npm run dist         # gera o pacote da plataforma atual em build/
```

Para gerar o instalador do Windows a partir do Linux, use `npx electron-builder --win`. A etapa final do instalador NSIS exige o [Wine](https://www.winehq.org/); sem ele, gere o instalador numa máquina Windows.

### Estrutura do projeto

```
src/
├── main/       Processo principal: janela, sistema de arquivos, renomeação em lote, menus nativos
├── preload/    Ponte segura entre a interface e o processo principal (contextBridge)
├── renderer/   Interface em React (componentes, hooks e utilitários)
└── shared/     Código usado pelos dois lados: motor de renomeação, caminhos, idiomas e contrato IPC
```

O motor de renomeação (`src/shared/rename`) é TypeScript puro, sem dependência do Electron, e é coberto por testes. Os textos da interface ficam em `src/shared/i18n/catalogs`. O português é a referência, e o TypeScript acusa se faltar alguma tradução nos outros idiomas.

## Onde ficam as preferências

Tema, idioma, regras, filtros, ordenação, larguras e última pasta aberta ficam salvos na pasta de dados do app:

- **Linux:** `~/.config/rename-plus/`
- **Windows:** `%APPDATA%\rename-plus\`

Apagar essa pasta volta o app às configurações iniciais.

## Autor

Desenvolvido por **Generson Silva**.

Inspirado no [Bulk Rename Utility](https://github.com/BulkRenameUtility/download). Veja [Inspiração e créditos](#inspiração-e-créditos).
