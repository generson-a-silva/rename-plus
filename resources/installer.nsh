; Rename Plus: opções extras do instalador do Windows (NSIS).
; O electron-builder inclui este arquivo automaticamente (buildResources/installer.nsh).
;
; Página "Menu de contexto": adiciona ao Explorador de Arquivos
;   - "Abrir no Rename Plus" (um arquivo/pasta, ou o fundo de uma pasta);
;   - "Abrir selecionados no Rename Plus" (vários itens).
; As mesmas chaves (em HKCU) são gerenciadas pelo app em Configurações; os nomes e os
; argumentos precisam bater com src/main/shell-integration/windowsExplorerRegistry.ts.
;
; Página "Pastas monitoradas": inicia o app com o Windows, sem janela (--background),
; para todos os usuários (...\CurrentVersion\Run). Cada usuário pode desativar em
; Configurações; nome e argumento precisam bater com src/main/backgroundLaunch.ts.

!define RP_OPEN_KEY "RenamePlus.Open"
!define RP_SELECT_KEY "RenamePlus.OpenSelection"
!define RP_RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Run"
!define RP_RUN_VALUE "Rename Plus"
!define RP_BACKGROUND_FLAG "--background"

; Uma entrada do menu de contexto: KEY é relativo a Software\Classes.
!macro rpWriteVerb ROOT KEY LABEL ARGS MULTI
  WriteRegStr ${ROOT} "Software\Classes\${KEY}" "MUIVerb" "${LABEL}"
  WriteRegStr ${ROOT} "Software\Classes\${KEY}" "Icon" "$appExe,0"
  !if "${MULTI}" != ""
    WriteRegStr ${ROOT} "Software\Classes\${KEY}" "MultiSelectModel" "${MULTI}"
  !endif
  WriteRegStr ${ROOT} "Software\Classes\${KEY}\command" "" '"$appExe" ${ARGS}'
!macroend

!macro rpWriteContextMenu
  ; "Single": só aparece com um item selecionado. "Player": com qualquer quantidade
  ; (o Explorador abre um processo por item; o app junta tudo numa janela só).
  !insertmacro rpWriteVerb SHCTX "*\shell\${RP_OPEN_KEY}" "$(rpOpenLabel)" '--open -- "%1"' "Single"
  !insertmacro rpWriteVerb SHCTX "Directory\shell\${RP_OPEN_KEY}" "$(rpOpenLabel)" '--open -- "%1"' "Single"
  !insertmacro rpWriteVerb SHCTX "Directory\Background\shell\${RP_OPEN_KEY}" "$(rpOpenLabel)" '--open -- "%V"' ""
  !insertmacro rpWriteVerb SHCTX "Drive\shell\${RP_OPEN_KEY}" "$(rpOpenLabel)" '--open -- "%1"' "Single"
  !insertmacro rpWriteVerb SHCTX "*\shell\${RP_SELECT_KEY}" "$(rpSelectLabel)" '--select -- "%1"' "Player"
  !insertmacro rpWriteVerb SHCTX "Directory\shell\${RP_SELECT_KEY}" "$(rpSelectLabel)" '--select -- "%1"' "Player"
!macroend

!macro rpDeleteContextMenu ROOT
  DeleteRegKey ${ROOT} "Software\Classes\*\shell\${RP_OPEN_KEY}"
  DeleteRegKey ${ROOT} "Software\Classes\Directory\shell\${RP_OPEN_KEY}"
  DeleteRegKey ${ROOT} "Software\Classes\Directory\Background\shell\${RP_OPEN_KEY}"
  DeleteRegKey ${ROOT} "Software\Classes\Drive\shell\${RP_OPEN_KEY}"
  DeleteRegKey ${ROOT} "Software\Classes\*\shell\${RP_SELECT_KEY}"
  DeleteRegKey ${ROOT} "Software\Classes\Directory\shell\${RP_SELECT_KEY}"
!macroend

!macro rpWriteBackground
  WriteRegStr SHCTX "${RP_RUN_KEY}" "${RP_RUN_VALUE}" '"$appExe" ${RP_BACKGROUND_FLAG}'
!macroend

; Inicia já em segundo plano, como o usuário comum (o instalador roda como administrador).
; Sem pastas monitoradas configuradas, o app encerra sozinho na hora.
!macro rpStartBackground
  ${StdUtils.ExecShellAsUser} $0 "$appExe" "open" "${RP_BACKGROUND_FLAG}"
!macroend

; ---- Textos (idiomas do instalador: nsis.installerLanguages) -----------------
!macro customHeader
  !ifndef BUILD_UNINSTALLER
    LangString rpPageTitle ${LANG_PORTUGUESEBR} "Menu de contexto"
    LangString rpPageTitle ${LANG_ENGLISH} "Context menu"
    LangString rpPageTitle ${LANG_SPANISHINTERNATIONAL} "Menú contextual"

    LangString rpPageSubtitle ${LANG_PORTUGUESEBR} "Abra arquivos e pastas no Rename Plus direto do Explorador de Arquivos."
    LangString rpPageSubtitle ${LANG_ENGLISH} "Open files and folders in Rename Plus straight from File Explorer."
    LangString rpPageSubtitle ${LANG_SPANISHINTERNATIONAL} "Abra archivos y carpetas en Rename Plus directamente desde el Explorador de archivos."

    LangString rpPageText ${LANG_PORTUGUESEBR} "Ao clicar com o botão direito no Explorador de Arquivos:$\r$\n$\r$\n  • Abrir no Rename Plus: abre a pasta, ou a pasta do arquivo com ele selecionado.$\r$\n  • Abrir selecionados no Rename Plus: abre a pasta com todos os itens selecionados.$\r$\n$\r$\nNo Windows 11, as opções ficam em $\"Mostrar mais opções$\". Também é possível alterar isso depois, em Configurações no app."
    LangString rpPageText ${LANG_ENGLISH} "When you right-click in File Explorer:$\r$\n$\r$\n  • Open in Rename Plus: opens the folder, or the file's folder with the file selected.$\r$\n  • Open selected in Rename Plus: opens the folder with all the items selected.$\r$\n$\r$\nOn Windows 11, the options are under $\"Show more options$\". You can also change this later in the app's Settings."
    LangString rpPageText ${LANG_SPANISHINTERNATIONAL} "Al hacer clic derecho en el Explorador de archivos:$\r$\n$\r$\n  • Abrir en Rename Plus: abre la carpeta, o la carpeta del archivo con él seleccionado.$\r$\n  • Abrir seleccionados en Rename Plus: abre la carpeta con todos los elementos seleccionados.$\r$\n$\r$\nEn Windows 11, las opciones están en $\"Mostrar más opciones$\". También puede cambiarlo después en la Configuración de la app."

    LangString rpCheckbox ${LANG_PORTUGUESEBR} "Adicionar as opções ao menu de contexto do Explorador de Arquivos"
    LangString rpCheckbox ${LANG_ENGLISH} "Add the options to the File Explorer context menu"
    LangString rpCheckbox ${LANG_SPANISHINTERNATIONAL} "Añadir las opciones al menú contextual del Explorador de archivos"

    LangString rpOpenLabel ${LANG_PORTUGUESEBR} "Abrir no Rename Plus"
    LangString rpOpenLabel ${LANG_ENGLISH} "Open in Rename Plus"
    LangString rpOpenLabel ${LANG_SPANISHINTERNATIONAL} "Abrir en Rename Plus"

    LangString rpSelectLabel ${LANG_PORTUGUESEBR} "Abrir selecionados no Rename Plus"
    LangString rpSelectLabel ${LANG_ENGLISH} "Open selected in Rename Plus"
    LangString rpSelectLabel ${LANG_SPANISHINTERNATIONAL} "Abrir seleccionados en Rename Plus"

    LangString rpBgPageTitle ${LANG_PORTUGUESEBR} "Pastas monitoradas"
    LangString rpBgPageTitle ${LANG_ENGLISH} "Watch folders"
    LangString rpBgPageTitle ${LANG_SPANISHINTERNATIONAL} "Carpetas vigiladas"

    LangString rpBgPageSubtitle ${LANG_PORTUGUESEBR} "Renomeie automaticamente os arquivos que chegam a uma pasta, mesmo com o app fechado."
    LangString rpBgPageSubtitle ${LANG_ENGLISH} "Automatically rename files that land in a folder, even when the app is closed."
    LangString rpBgPageSubtitle ${LANG_SPANISHINTERNATIONAL} "Renombre automáticamente los archivos que llegan a una carpeta, incluso con la aplicación cerrada."

    LangString rpBgPageText ${LANG_PORTUGUESEBR} "Com esta opção, o Rename Plus inicia com o Windows, sem janela, e fica no ícone da bandeja enquanto houver pastas monitoradas configuradas (Configurações › Pastas monitoradas).$\r$\n$\r$\nSem nenhuma pasta configurada, ele encerra logo ao iniciar e não fica rodando.$\r$\n$\r$\nCada usuário pode desativar isso depois, em Configurações no app."
    LangString rpBgPageText ${LANG_ENGLISH} "With this option, Rename Plus starts with Windows, without a window, and stays in the tray while there are watch folders set up (Settings › Watch folders).$\r$\n$\r$\nWith no folders set up, it exits right after starting and doesn't keep running.$\r$\n$\r$\nEach user can turn this off later in the app's Settings."
    LangString rpBgPageText ${LANG_SPANISHINTERNATIONAL} "Con esta opción, Rename Plus se inicia con Windows, sin ventana, y queda en la bandeja mientras haya carpetas vigiladas configuradas (Configuración › Carpetas vigiladas).$\r$\n$\r$\nSin ninguna carpeta configurada, se cierra nada más iniciarse y no sigue ejecutándose.$\r$\n$\r$\nCada usuario puede desactivarlo después en la Configuración de la aplicación."

    LangString rpBgCheckbox ${LANG_PORTUGUESEBR} "Monitorar pastas em segundo plano (iniciar com o Windows)"
    LangString rpBgCheckbox ${LANG_ENGLISH} "Watch folders in the background (start with Windows)"
    LangString rpBgCheckbox ${LANG_SPANISHINTERNATIONAL} "Vigilar carpetas en segundo plano (iniciar con Windows)"
  !endif
!macroend

; ---- Página do instalador (depois da escolha da pasta) -----------------------
!macro customPageAfterChangeDir
  Var rpContextMenuCheckbox
  ; Vazio (padrão, também na instalação silenciosa) = adicionar.
  Var rpAddContextMenu

  Page custom rpContextMenuPageCreate rpContextMenuPageLeave

  Function rpContextMenuPageCreate
    ; Atualizações mantêm a escolha feita na instalação.
    ${if} ${isUpdated}
      Abort
    ${endif}
    !insertmacro MUI_HEADER_TEXT "$(rpPageTitle)" "$(rpPageSubtitle)"
    nsDialogs::Create 1018
    Pop $0
    ${if} $0 == error
      Abort
    ${endif}
    ${NSD_CreateLabel} 0 0 100% 90u "$(rpPageText)"
    Pop $0
    ${NSD_CreateCheckbox} 0 100u 100% 12u "$(rpCheckbox)"
    Pop $rpContextMenuCheckbox
    ${if} $rpAddContextMenu != ${BST_UNCHECKED}
      ${NSD_Check} $rpContextMenuCheckbox
    ${endif}
    nsDialogs::Show
  FunctionEnd

  Function rpContextMenuPageLeave
    ${NSD_GetState} $rpContextMenuCheckbox $rpAddContextMenu
  FunctionEnd

  Var rpBackgroundCheckbox
  ; Vazio (padrão, também na instalação silenciosa) = ativar.
  Var rpEnableBackground

  Page custom rpBackgroundPageCreate rpBackgroundPageLeave

  Function rpBackgroundPageCreate
    ; Atualizações mantêm a escolha feita na instalação.
    ${if} ${isUpdated}
      Abort
    ${endif}
    !insertmacro MUI_HEADER_TEXT "$(rpBgPageTitle)" "$(rpBgPageSubtitle)"
    nsDialogs::Create 1018
    Pop $0
    ${if} $0 == error
      Abort
    ${endif}
    ${NSD_CreateLabel} 0 0 100% 90u "$(rpBgPageText)"
    Pop $0
    ${NSD_CreateCheckbox} 0 100u 100% 12u "$(rpBgCheckbox)"
    Pop $rpBackgroundCheckbox
    ${if} $rpEnableBackground != ${BST_UNCHECKED}
      ${NSD_Check} $rpBackgroundCheckbox
    ${endif}
    nsDialogs::Show
  FunctionEnd

  Function rpBackgroundPageLeave
    ${NSD_GetState} $rpBackgroundCheckbox $rpEnableBackground
  FunctionEnd
!macroend

; ---- Instalação e remoção ----------------------------------------------------
!macro customInstall
  ${if} ${isUpdated}
    ; Atualização: só renova as entradas que já existiam (o caminho do .exe pode mudar).
    ReadRegStr $0 SHCTX "Software\Classes\*\shell\${RP_OPEN_KEY}" "MUIVerb"
    ${if} $0 != ""
      !insertmacro rpWriteContextMenu
    ${endif}
  ${elseif} $rpAddContextMenu != ${BST_UNCHECKED}
    !insertmacro rpWriteContextMenu
  ${else}
    !insertmacro rpDeleteContextMenu SHCTX
  ${endif}

  ; Início com o Windows (pastas monitoradas em segundo plano).
  ${if} ${isUpdated}
    ; Atualização: renova a entrada que já existia (o caminho do .exe pode mudar).
    ReadRegStr $0 SHCTX "${RP_RUN_KEY}" "${RP_RUN_VALUE}"
    ${if} $0 != ""
      !insertmacro rpWriteBackground
    ${endif}
  ${elseif} $rpEnableBackground != ${BST_UNCHECKED}
    !insertmacro rpWriteBackground
  ${else}
    DeleteRegValue SHCTX "${RP_RUN_KEY}" "${RP_RUN_VALUE}"
  ${endif}

  ; Ativo logo após instalar/atualizar, sem esperar o próximo login: pela entrada do
  ; instalador ou pela que o usuário ativou em Configurações (HKCU).
  ReadRegStr $0 SHCTX "${RP_RUN_KEY}" "${RP_RUN_VALUE}"
  ReadRegStr $1 HKCU "${RP_RUN_KEY}" "${RP_RUN_VALUE}"
  ${if} $0 != ""
  ${orIf} $1 != ""
    !insertmacro rpStartBackground
  ${endif}
!macroend

!macro customUnInstall
  ; Na atualização, o desinstalador da versão anterior roda antes: as entradas ficam.
  ${ifNot} ${isUpdated}
    !insertmacro rpDeleteContextMenu SHCTX
    ; Entradas criadas pelo próprio app (Configurações), só para o usuário atual.
    !insertmacro rpDeleteContextMenu HKCU
    DeleteRegValue SHCTX "${RP_RUN_KEY}" "${RP_RUN_VALUE}"
    DeleteRegValue HKCU "${RP_RUN_KEY}" "${RP_RUN_VALUE}"
  ${endif}
!macroend
