<p align="center">
  <img src="resources/icon.png" alt="Icono de Rename Plus" width="128" height="128">
</p>

<h1 align="center">Rename Plus</h1>

<p align="center">
  Renombrador de archivos y carpetas por lotes, con vista previa en vivo, para Linux y Windows.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <b>Español</b>
</p>

<p align="center">
  <a href="https://github.com/generson-a-silva/rename-plus/releases/latest"><img alt="Última versión" src="https://img.shields.io/github/v/release/generson-a-silva/rename-plus?label=versi%C3%B3n&color=2f6fe4"></a>
  <img alt="Linux" src="https://img.shields.io/badge/Linux-compatible-1a7f37?logo=linux&logoColor=white">
  <img alt="Windows" src="https://img.shields.io/badge/Windows-compatible-1a7f37?logo=windows&logoColor=white">
  <img alt="macOS" src="https://img.shields.io/badge/macOS-previsto-8d96a0?logo=apple&logoColor=white">
  <img alt="Idiomas" src="https://img.shields.io/badge/idiomas-ES%20%C2%B7%20EN%20%C2%B7%20PT-2f6fe4">
</p>

<p align="center">
  <a href="https://github.com/generson-a-silva/rename-plus/releases/latest"><img alt="Descargar la última versión" src="https://img.shields.io/badge/%E2%AC%87%20Descargar-%C3%BAltima%20versi%C3%B3n-1a7f37?style=for-the-badge"></a>
</p>

<p align="center">
  <img src="docs/screenshot.png" alt="Ventana de Rename Plus: árbol de carpetas a la izquierda, lista de fotos con los nuevos nombres en verde a la derecha y los paneles de reglas abajo" width="900">
</p>

---

## Índice

- [Acerca de](#acerca-de)
- [Capturas](#capturas)
- [Inspiración y créditos](#inspiración-y-créditos)
- [Funciones](#funciones)
- [Cómo se aplican las reglas](#cómo-se-aplican-las-reglas)
- [Lo que Rename Plus no hace](#lo-que-rename-plus-no-hace)
- [Plataformas compatibles](#plataformas-compatibles)
- [Instalación](#instalación)
- [Atajos de teclado](#atajos-de-teclado)
- [Desarrollo](#desarrollo)
- [Dónde se guarda la configuración](#dónde-se-guarda-la-configuración)
- [Autor](#autor)

## Acerca de

**Rename Plus** renombra muchos archivos y carpetas a la vez con reglas combinables: expresiones regulares, reemplazo de texto, mayúsculas/minúsculas, eliminación de partes del nombre, prefijos y sufijos, fechas, nombre de la carpeta, numeración y extensión.

Nada se modifica en el disco hasta que confirmas. La columna **Nuevo nombre** muestra el resultado de cada elemento seleccionado mientras escribes. Los conflictos, como dos archivos que acabarían con el mismo nombre o caracteres que el sistema no admite, aparecen en rojo y bloquean la operación. Después de renombrar, puedes **deshacer** el último lote.

La ventana tiene tres zonas: el árbol de carpetas a la izquierda, la lista de archivos a la derecha y los paneles de reglas abajo, con los botones **Renombrar**, **Deshacer** y **Restablecer** siempre visibles.

## Capturas

Las capturas muestran la interfaz en portugués. La aplicación también está disponible en español e inglés.

<table>
  <tr>
    <td width="50%" valign="top">
      <a href="docs/screenshots/subpastas.png"><img src="docs/screenshots/subpastas.png" alt="Tema claro en modo Subcarpetas: pistas de dos CD renombradas como '01 - Opening Theme.mp3', con la numeración reiniciándose en cada carpeta"></a>
      <p><b>Varias reglas y subcarpetas.</b> Quitar, Reemplazar, Título, Numeración por carpeta y extensión en minúsculas, aplicados a las pistas de dos CD a la vez (tema claro).</p>
    </td>
    <td width="50%" valign="top">
      <a href="docs/screenshots/conflitos.png"><img src="docs/screenshots/conflitos.png" alt="Filas en rojo con el nuevo nombre 'foto.jpg' repetido; la barra de estado muestra 4 conflictos y el botón Renombrar está bloqueado"></a>
      <p><b>Conflictos.</b> Los nombres repetidos en el lote o iguales a un archivo que ya existe se marcan en rojo y el botón Renombrar se bloquea. El motivo aparece al pasar el ratón sobre la fila.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="docs/screenshots/erros.png"><img src="docs/screenshots/erros.png" alt="Panel de acciones con 'RegEx no válida: Unterminated group' y la barra de estado con 'Carpeta no encontrada'"></a>
      <p><b>Mensajes de error.</b> Una RegEx no válida se explica en el panel de acciones; las rutas inexistentes escritas en la barra de direcciones aparecen en rojo en la barra de estado.</p>
    </td>
    <td width="50%" valign="top">
      <a href="docs/screenshots/validacao.png"><img src="docs/screenshots/validacao.png" alt="Diálogo 'Renombrar archivo' con el campo en rojo y el mensaje 'Contiene el carácter &quot;/&quot;'"></a>
      <p><b>Validación de nombres.</b> Al renombrar un elemento (F2) o crear una carpeta, los nombres que el sistema no admite se señalan antes de confirmar.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="docs/screenshots/arrastar.png"><img src="docs/screenshots/arrastar.png" alt="Ventana con borde discontinuo y el aviso 'Suelta para abrir'"></a>
      <p><b>Arrastrar y soltar.</b> Suelta una carpeta para abrirla, o archivos para abrir su carpeta con ellos ya seleccionados.</p>
    </td>
    <td width="50%" valign="top">
      <a href="docs/screenshots/configuracoes.png"><img src="docs/screenshots/configuracoes.png" alt="Configuración con las secciones Apariencia, Actualizaciones y Carpetas vigiladas; la versión instalada 1.4.0 es la más reciente"></a>
      <p><b>Configuración.</b> Tema de la interfaz, comprobación de actualizaciones en GitHub y carpetas vigiladas, además de las opciones «Abrir en Rename Plus» en el menú contextual del gestor de archivos.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="docs/screenshots/construtor-regex.png"><img src="docs/screenshots/construtor-regex.png" alt="Constructor visual de RegEx: paleta de bloques, la búsqueda 'Inicio del nombre + Texto exacto IMG_ + Números (Fragmento 1)' y el reemplazo 'Texto + Fragmento guardado'"></a>
      <p><b>Constructor visual de RegEx.</b> La búsqueda y el reemplazo se arman con bloques que se arrastran, con ejemplos listos. Aquí, <code>IMG_2041.JPG</code> pasa a <code>Foto 2041.JPG</code>.</p>
    </td>
    <td width="50%" valign="top">
      <a href="docs/screenshots/pastas-monitoradas.png"><img src="docs/screenshots/pastas-monitoradas.png" alt="Carpetas vigiladas: segundo plano activado y la regla 'Faturas' vigilando los PDF de la carpeta Downloads"></a>
      <p><b>Carpetas vigiladas.</b> Los PDF que llegan a Downloads reciben la fecha delante, pasan a Título y van a <code>Documentos/Faturas</code>, incluso con la aplicación cerrada (segundo plano activado).</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="docs/screenshots/pastas-monitoradas-atividade.png"><img src="docs/screenshots/pastas-monitoradas-atividade.png" alt="Regla de carpeta vigilada con un nombre de prueba y la actividad reciente con tres PDF renombrados y movidos"></a>
      <p><b>Prueba y actividad.</b> Prueba la regla con un nombre de ejemplo antes de que llegue ningún archivo y consulta en el registro de actividad qué se renombró (o qué falló).</p>
    </td>
    <td width="50%" valign="top"></td>
  </tr>
</table>

## Inspiración y créditos

Rename Plus está inspirado en **[Bulk Rename Utility](https://github.com/BulkRenameUtility/download)**, un renombrador por lotes de código cerrado para Windows. La organización de los paneles numerados y el orden en que se aplican las reglas siguen el modelo que él popularizó.

Rename Plus es un proyecto independiente, escrito desde cero:

- **no usa código** de Bulk Rename Utility;
- **no está afiliado** a sus autores ni cuenta con su respaldo;
- **no es un sustituto completo**: consulta [lo que Rename Plus no hace](#lo-que-rename-plus-no-hace).

Si usas Windows y necesitas funciones avanzadas como metadatos EXIF/ID3, scripts en JavaScript o importación de CSV, echa un vistazo a Bulk Rename Utility.

## Funciones

### Reglas de renombrado

| Panel | Qué hace |
|---|---|
| **RegEx** | Buscar y reemplazar con expresiones regulares, con grupos de captura (`$1`, `$2`…), opción de incluir la extensión, reemplazo global y sin distinguir mayúsculas. El **Constructor visual** arma la expresión con bloques que se arrastran, sin escribir RegEx. |
| **Nombre** | Mantener, quitar, cambiar por un nombre fijo o invertir el nombre original. |
| **Reemplazar** | Reemplazo de texto literal, distinguiendo mayúsculas o no. |
| **Mayúsc./Minúsc.** | minúsculas, MAYÚSCULAS, Título y Oración, con una lista de palabras de excepción. |
| **Quitar** | Primeros/últimos N caracteres, un intervalo por posición, caracteres y palabras concretos, recortar antes/después de un texto, dígitos, tildes, símbolos, caracteres no ASCII, espacios dobles, espacios en los extremos y puntos iniciales. |
| **Añadir** | Prefijo, sufijo, inserción en una posición (negativa cuenta desde el final) y separación de palabras unidas (`MiFoto` → `Mi Foto`). |
| **Fecha automática** | Fecha de modificación, de creación o actual, como prefijo o sufijo, en el formato que quieras (`YYYY-MM-DD`, `DD.MM.YY`…). |
| **Nombre de la carpeta** | Añade el nombre de una o más carpetas superiores. |
| **Numeración** | Prefijo, sufijo, ambos o en una posición; inicio, incremento, ceros a la izquierda; estilos `1, 2, 3`, `a, b, c`, `A, B, C` e `I, II, III`; reinicio por carpeta. |
| **Extensión** | Mantener, minúsculas, MAYÚSCULAS, Título, quitar, cambiar por una fija o añadir una extra. |
| **Filtros** | Máscara de nombres (`*.jpg; *.png`), archivos y/o carpetas, elementos ocultos y contenido de las subcarpetas (modo recursivo). Está en la columna de acciones. |

**Presets:** el botón de guardar, en la esquina superior derecha de los paneles, guarda las reglas actuales con un nombre. Para aplicarlas de nuevo, elige el preset en la lista junto al selector de idioma, que también permite eliminarlo. Las reglas de las carpetas vigiladas tienen la misma lista.

### Constructor visual de RegEx

Para quien no escribe expresiones regulares: en el panel **RegEx**, el botón **Constructor visual** abre una pantalla donde la búsqueda se arma con bloques, de izquierda a derecha («Inicio del nombre», «Texto exacto», «Números», «Letras», «Separador», «Una de estas palabras»…), y el reemplazo también («Texto», «Fragmento guardado», «Texto encontrado»).

- Arrastra los bloques de la paleta a la franja (o haz clic para añadirlos al final) y arrástralos por el título para reordenar; los botones ◀ ▶ hacen lo mismo con el teclado.
- Cada bloque define cuántas veces aparece (una vez, opcional, una o más, exactamente N, entre N y M) y si se debe **guardar el fragmento** para reutilizarlo en el reemplazo.
- Ejemplos listos: espacios → `_`, `IMG_1234` → `Foto 1234`, quitar números del inicio, invertir fechas `2024-06-10` → `10-06-2024`, quitar `(…)`.
- Vista previa en los archivos seleccionados y en un nombre que escribas; la expresión generada queda visible por si quieres revisarla.

### Carpetas vigiladas

En **Configuración › Carpetas vigiladas**, elige una carpeta (p. ej., Descargas): cada archivo nuevo que llegue a ella se renombra automáticamente y, si quieres, se mueve a otra carpeta. Por defecto no hay ninguna carpeta vigilada.

- Las reglas de renombrado son las de la pantalla principal: configúralas con la vista previa y usa **Copiar reglas de la pantalla principal**, o elige un preset guardado.
- Máscara de archivos (`*.pdf; *.jpg`), carpeta de destino opcional, prueba con un nombre de ejemplo y notificación del sistema por cada archivo.
- Espera a que el archivo termine de escribirse e ignora descargas en curso (`.crdownload`, `.part`…), archivos ocultos y subcarpetas. Nunca sobrescribe: los nombres repetidos reciben ` (2)`.
- Solo archivos nuevos (lo que ya estaba en la carpeta no se toca). El registro de actividad muestra lo que se hizo y los fallos.
- **Sigue funcionando con la aplicación cerrada:** con **Seguir vigilando con la aplicación cerrada** activado, Rename Plus se inicia con tu sesión, sin ventana, y queda en la bandeja mientras haya carpetas vigiladas activas (menú de la bandeja: abrir, salir). Abrir la aplicación solo muestra la ventana en ese mismo proceso. Sin carpetas vigiladas activas, se cierra al momento y no sigue ejecutándose sin motivo.
  - **Windows:** el instalador tiene la página «Carpetas vigiladas» para activarlo para todos los usuarios (marcada por defecto; desmárcala para instalar sin ella). Cada usuario puede desactivarlo en Configuración.
  - **Linux (AppImage):** no hay paso de instalación, así que actívalo en Configuración. Se crea `~/.config/autostart/rename-plus-background.desktop` (XDG Autostart, usado por KDE, GNOME, Xfce, Cinnamon…). Si mueves o sustituyes el AppImage, ábrelo una vez para corregir la entrada; abrir un AppImage nuevo con el antiguo en segundo plano cede el control al nuevo.

### Actualizaciones

La aplicación consulta las [releases de GitHub](https://github.com/generson-a-silva/rename-plus/releases) al abrirse y cada 12 horas, y avisa cuando hay una versión nueva (notificación del sistema y aviso en la barra de estado). No se descarga ni se instala nada automáticamente. En **Configuración › Actualizaciones** puedes comprobar al momento, omitir una versión o desactivar la comprobación.

### Vista previa y seguridad

- **Vista previa en vivo:** el nuevo nombre se calcula mientras escribes, solo para los elementos seleccionados.
- **Detección de conflictos:** nombres duplicados en el lote, choques con archivos existentes y nombres que el sistema no admite. Por ejemplo: `/` en Linux; `< > : " \ | ? *`, `CON`, `NUL` y un punto o espacio al final en Windows. El motivo aparece al pasar el ratón sobre la fila.
- **Renombrado «todo o nada»:** el lote se valida antes de tocar el disco y se ejecuta en dos pasos, lo que permite intercambiar nombres entre archivos (`a ↔ b`). Si algo falla a mitad, lo ya renombrado vuelve a su nombre original.
- **Nunca sobrescribe** archivos existentes, tampoco al copiar o mover (los nombres repetidos reciben el sufijo ` (2)`, ` (3)`…).
- **Deshacer** el último lote, incluidos los renombrados hechos desde el menú contextual.

### Navegación y selección

- Árbol de carpetas que se carga bajo demanda, con la carpeta personal y las raíces del sistema (`/` en Linux, unidades `C:`, `D:`… en Windows).
- Lista de archivos rápida incluso en carpetas grandes (solo dibuja las filas visibles), con ordenación por columna y columnas redimensionables (doble clic en el divisor para ajustar al contenido).
- Selección como en un gestor de archivos: clic, Ctrl/Mayús+clic, **arrastrar para seleccionar** un rectángulo con desplazamiento automático, y clic en una zona vacía para limpiar.
- Los elementos ocultos no se muestran por defecto y se pueden mostrar (aparecen atenuados).

### Operaciones con archivos (menú contextual)

Clic derecho en la lista o en el árbol para abrir con la aplicación predeterminada, mostrar en el gestor de archivos, renombrar un elemento, cortar, copiar y pegar, copiar la ruta, crear una carpeta y mover a la papelera. En discos sin papelera, la aplicación ofrece eliminar definitivamente, con confirmación.

### Abrir elementos desde fuera de la aplicación

- **Arrastrar y soltar:** suelta una carpeta en la ventana para abrirla, o archivos para abrir su carpeta con ellos ya seleccionados.
- **Menú contextual del sistema:** «Abrir en Rename Plus» (un elemento) y «Abrir seleccionados en Rename Plus» (varios). En Windows, el instalador ofrece la opción; en Linux se activa en **Configuración** para Dolphin, Nautilus, Nemo, Thunar, Caja o PCManFM, con el gestor predeterminado del sistema destacado.
- **Línea de comandos:** `rename-plus [--open | --select] [--] rutas…`. Si la aplicación ya está abierta, los elementos van a la ventana existente.

### Interfaz

- Tema **claro**, **oscuro** o **según el sistema**, elegido en **Configuración** (botón a la derecha de la barra superior).
- Idiomas **español**, **inglés** y **portugués**, elegidos con el botón de la esquina inferior derecha de la zona de acciones. El idioma inicial sigue al del sistema.
- Diseño ajustable: ancho del árbol, alto de la zona de reglas (hasta la mitad de la ventana) y ancho de las columnas.
- La ventana recuerda su tamaño, su posición y si estaba maximizada. En la primera ejecución se abre maximizada.

## Cómo se aplican las reglas

Las reglas se aplican siempre en este orden, cada una sobre el resultado de la anterior:

```
RegEx → Nombre → Reemplazar → Mayúsc./Minúsc. → Quitar → Añadir
      → Fecha automática → Nombre de la carpeta → Numeración → Extensión
```

Ejemplo de la captura principal (arriba): `IMG_2041.JPG` → RegEx cambia `IMG_2041` por `Lisboa` → Fecha automática añade `2024-06-10 ` → Numeración añade ` - 01` → Extensión en minúsculas → **`2024-06-10 Lisboa - 01.jpg`**.

En las carpetas, el punto **no** se trata como separador de extensión (`v1.2` sigue siendo el nombre completo), y lo mismo ocurre con archivos ocultos como `.bashrc`.

## Lo que Rename Plus no hace

Para dejar claro el alcance actual:

- **No lee metadatos de archivos:** no usa EXIF de fotos, ID3 de música ni propiedades de documentos para formar nombres.
- **No ejecuta scripts** (p. ej., JavaScript) ni importa listas de nombres de archivos desde CSV.
- **No mueve ni copia partes del nombre** de una posición a otra (el panel «Mover/Copiar» de Bulk Rename Utility).
- **No cambia fechas, atributos ni permisos** de los archivos; solo los nombres.
- **No mueve archivos a otra carpeta al renombrar** desde la pantalla principal: el nuevo nombre se queda siempre en la misma carpeta (para mover, usa cortar y pegar). Solo las carpetas vigiladas mueven archivos.
- **No funciona como servicio del sistema:** la vigilancia en segundo plano se ejecuta en tu sesión de usuario (se inicia al entrar), no antes del inicio de sesión ni para otros usuarios.
- **No instala actualizaciones por sí sola:** solo avisa y abre la página de la versión en GitHub.
- **No renombra desde la línea de comandos:** esta solo abre carpetas y archivos en la aplicación, y no hay programación de tareas.
- **«Deshacer» solo cubre el último lote**, y solo mientras la aplicación está abierta.
- **Límite de listado:** muestra hasta 50 000 elementos a la vez; por encima de eso la lista se trunca, con un aviso.
- **No funciona en macOS** por ahora.

## Plataformas compatibles

| Sistema | Estado | Paquete | Observaciones |
|---|---|---|---|
| **Linux** (x64) | ✅ Compatible y probado | AppImage | Probado en KDE Plasma (Wayland). En Wayland, el sistema decide en qué monitor se abre la ventana, así que la aplicación restaura el tamaño de la ventana pero no su posición. |
| **Windows** (x64) | ✅ Compatible | Instalador NSIS | Se instala para todos los usuarios (pide permiso de administrador) y crea el acceso directo «Rename Plus» en el escritorio y en el menú Inicio. Aún en validación en equipos reales. |
| **macOS** | 🕓 Previsto | — | Todavía no es compatible. |

## Instalación

Descarga el paquete de tu sistema en la **[última release](https://github.com/generson-a-silva/rename-plus/releases/latest)**, en «Assets»:

| Sistema | Archivo |
|---|---|
| Linux (x64) | `rename-plus-<versión>-linux-x86_64.AppImage` |
| Windows (x64) | `rename-plus-<versión>-win-x64.exe` |

Las versiones anteriores están en la [lista de releases](https://github.com/generson-a-silva/rename-plus/releases). Para generar el paquete desde el código, consulta [Desarrollo](#desarrollo).

### Linux (AppImage)

1. Descarga `rename-plus-<versión>-linux-x86_64.AppImage` de la [última release](https://github.com/generson-a-silva/rename-plus/releases/latest).
2. Dale permiso de ejecución y ábrelo:

   ```bash
   chmod +x rename-plus-*.AppImage
   ./rename-plus-*.AppImage
   ```

3. **Opcional:** intégralo en el menú de aplicaciones con [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) u otra herramienta de integración de AppImage.
4. **Opcional:** en **Configuración › Menú contextual del sistema**, añade las opciones a tu gestor de archivos. Si el AppImage cambia de lugar o de versión, basta con abrir la aplicación una vez para corregirlas.

### Windows

Descarga `rename-plus-<versión>-win-x64.exe` de la [última release](https://github.com/generson-a-silva/rename-plus/releases/latest), ejecuta el instalador y sigue los pasos. Uno de ellos ofrece añadir «Abrir en Rename Plus» y «Abrir seleccionados en Rename Plus» al menú contextual del Explorador de archivos (en Windows 11, en «Mostrar más opciones»). La aplicación aparece en «Aplicaciones instaladas» con **Generson Silva** como editor y se puede desinstalar desde allí.

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+A` | Seleccionar todos los elementos de la lista |
| `Esc` | Limpiar la selección |
| `F2` | Renombrar el elemento seleccionado |
| `Supr` | Mover a la papelera |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copiar / cortar / pegar |
| `Ctrl+Mayús+N` | Nueva carpeta |
| `Ctrl+H` | Mostrar/ocultar elementos ocultos |
| `F5` | Actualizar |
| `↑` `↓` `RePág` `AvPág` `Inicio` `Fin` | Moverse por la lista (con `Mayús` para ampliar la selección) |
| `Intro` / doble clic | Abrir carpeta o archivo |

## Desarrollo

**Tecnologías:** Electron, React, TypeScript, Vite, Vitest, Biome (lint y formato) y electron-builder.

**Requisitos:** Node.js 22.12 o superior y npm.

```bash
npm install          # instala las dependencias
npm run dev          # Vite + Electron con recarga automática
npm test             # pruebas (Vitest)
npm run ci           # lint (Biome) + comprobación de tipos + pruebas
npm run build        # compila en build-react/ y build-electron/
npm run dist         # genera el paquete de la plataforma actual en build/
```

Para generar el instalador de Windows desde Linux, usa `npx electron-builder --win`. El último paso del instalador NSIS requiere [Wine](https://www.winehq.org/); sin él, genera el instalador en un equipo con Windows.

### Estructura del proyecto

```
src/
├── main/       Proceso principal: ventana, sistema de archivos, renombrado por lotes, carpetas vigiladas, actualizaciones, menús nativos
├── preload/    Puente seguro entre la interfaz y el proceso principal (contextBridge)
├── renderer/   Interfaz en React (componentes, hooks y utilidades)
└── shared/     Código usado por ambos lados: motor de renombrado, constructor de RegEx, rutas, idiomas y contrato IPC
```

El motor de renombrado (`src/shared/rename`) es TypeScript puro, sin dependencia de Electron, y está cubierto por pruebas. Los textos de la interfaz están en `src/shared/i18n/catalogs`. El portugués es el catálogo de referencia, y TypeScript avisa si falta alguna traducción en los demás idiomas.

## Dónde se guarda la configuración

El tema, el idioma, las reglas, los presets, los filtros, la ordenación, los anchos y la última carpeta abierta se guardan en la carpeta de datos de la aplicación (las carpetas vigiladas en `watch-folders.json`, el modo en segundo plano en `background.json` y las preferencias de actualización en `updates.json`):

- **Linux:** `~/.config/rename-plus/`
- **Windows:** `%APPDATA%\rename-plus\`

Borrar esa carpeta devuelve la aplicación a la configuración inicial.

## Autor

Desarrollado por **Generson Silva**.

Inspirado en [Bulk Rename Utility](https://github.com/BulkRenameUtility/download). Consulta [Inspiración y créditos](#inspiración-y-créditos).
