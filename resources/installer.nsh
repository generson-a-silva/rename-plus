; Rename Plus: opções extras do instalador do Windows (NSIS).
; O electron-builder inclui este arquivo automaticamente (buildResources/installer.nsh).
;
; Página "Menu de contexto": adiciona ao Explorador de Arquivos
;   - "Abrir no Rename Plus" (um arquivo/pasta, ou o fundo de uma pasta);
;   - "Abrir selecionados no Rename Plus" (vários itens).
; As mesmas chaves (em HKCU) são gerenciadas pelo app em Configurações; os nomes e os
; argumentos precisam bater com src/main/shell-integration/windowsExplorerRegistry.ts.

!define RP_OPEN_KEY "RenamePlus.Open"
!define RP_SELECT_KEY "RenamePlus.OpenSelection"

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
!macroend

!macro customUnInstall
  ; Na atualização, o desinstalador da versão anterior roda antes: as entradas ficam.
  ${ifNot} ${isUpdated}
    !insertmacro rpDeleteContextMenu SHCTX
    ; Entradas criadas pelo próprio app (Configurações), só para o usuário atual.
    !insertmacro rpDeleteContextMenu HKCU
  ${endif}
!macroend
