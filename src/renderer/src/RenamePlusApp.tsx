import {
	DropOverlay,
	FileListView,
	FolderTreeView,
	NavigationToolbar,
	RenameOptionsPanels,
	RenameStatusBar,
	SettingsDialog,
	type StatusMessage,
	TextPromptDialog,
	type TreeRoot,
} from "@components";
import {
	type FileChange,
	useElementHeight,
	useFileCommands,
	useFileDrop,
	useFileOperations,
	useFolderTreeState,
	useI18n,
	usePersistentState,
	useResizableSplitter,
	useTextPrompt,
	useThemeMode,
	useUpdateStatus,
} from "@hooks";
import {
	baseName,
	createMaskFilter,
	DEFAULT_FILTERS,
	DEFAULT_SORT,
	describePreview,
	describeRenameFailure,
	expandHomeShortcut,
	joinPath,
	type ListFilters,
	parentPath,
	platformPaths,
	type SortState,
	sortEntries,
	toListOptions,
	treeRootFor,
} from "@lib";
import type { Translator } from "@shared/i18n";
import type {
	AppInfo,
	FileEntry,
	FileSystemRoot,
	LaunchMode,
	RenameOperation,
	RenameResult,
} from "@shared/ipc";
import {
	buildPreview,
	createDefaultOptions,
	type RenameOptions,
	type RenameSection,
} from "@shared/rename";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

interface Listing {
	entries: FileEntry[];
	truncated: boolean;
	loading: boolean;
	error: string | null;
}

const EMPTY_LISTING: Listing = { entries: [], truncated: false, loading: false, error: null };

/** Altura mínima da área de filtros e fração máxima da área de trabalho que ela pode ocupar. */
const MIN_PANELS_HEIGHT = 120;
const MAX_PANELS_FRACTION = 0.5;

/** Sistema em que o app roda: define regras de nome e comparação de caminhos na pré-visualização. */
const PREVIEW_CONTEXT = { platform: window.api.platform };

function toTreeRoot(root: FileSystemRoot, t: Translator): TreeRoot {
	switch (root.kind) {
		case "home":
			return { label: t("roots.home"), path: root.path, icon: "home" };
		case "filesystem":
			return { label: t("roots.filesystem"), path: root.path, icon: "drive" };
		case "drive":
			return {
				label: t("roots.drive", { drive: root.path.slice(0, 2) }),
				path: root.path,
				icon: "drive",
			};
	}
}

/** Janela principal: árvore de pastas, lista de arquivos, painéis de opções e barra de status. */
export function RenamePlusApp() {
	const [home, setHome] = useState<string | null>(null);
	const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
	const [currentDir, setCurrentDir] = usePersistentState<string>("lastDir", "");
	const [filters, setFilters] = usePersistentState<ListFilters>("filters", DEFAULT_FILTERS);
	const [options, setOptions] = usePersistentState<RenameOptions>(
		"options",
		createDefaultOptions(),
	);
	const [sort, setSort] = usePersistentState<SortState>("sort", DEFAULT_SORT);
	const [layout, setLayout] = usePersistentState("layout", { treeWidth: 260, panelsHeight: 340 });

	const [listing, setListing] = useState<Listing>(EMPTY_LISTING);
	const [selection, setSelection] = useState<Set<string>>(() => new Set());
	const [message, setMessage] = useState<StatusMessage | null>(null);
	const [busy, setBusy] = useState(false);
	const [canUndo, setCanUndo] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	/** A pasta inicial já foi definida: a partir daí, pedidos de fora podem trocá-la. */
	const [initialized, setInitialized] = useState(false);

	const { t, tr } = useI18n();
	const theme = useThemeMode();
	const updates = useUpdateStatus();
	const tree = useFolderTreeState(filters.hidden);
	const { reveal, refresh: refreshTree } = tree;

	const [fileSystemRoots, setFileSystemRoots] = useState<FileSystemRoot[]>([]);
	const roots = useMemo(
		() => fileSystemRoots.map((root) => toTreeRoot(root, t)),
		[fileSystemRoots, t],
	);

	// --- Inicialização -------------------------------------------------------
	const currentDirRef = useRef(currentDir);
	useEffect(() => {
		void (async () => {
			const [homeDir, rootList, info] = await Promise.all([
				window.api.getHomeDir(),
				window.api.listRoots(),
				window.api.getAppInfo(),
			]);
			setHome(homeDir);
			setAppInfo(info);
			setFileSystemRoots(rootList);
			const last = currentDirRef.current;
			const resolved = last ? await window.api.resolveDirectory(last) : null;
			setCurrentDir(resolved ?? homeDir);
			setInitialized(true);
		})();
	}, [setCurrentDir]);

	// O título da janela fica fixo ("Rename Plus", do index.html); a pasta atual aparece na barra de caminho.
	useEffect(() => {
		if (!currentDir) return;
		const root = treeRootFor(
			currentDir,
			roots.map((item) => item.path),
		);
		if (root) void reveal(root, currentDir);
	}, [currentDir, roots, reveal]);

	// --- Listagem ------------------------------------------------------------
	const { subfolders, hidden, files, folders } = filters;
	const listOptions = useMemo(
		() => toListOptions({ subfolders, hidden, files, folders }),
		[subfolders, hidden, files, folders],
	);

	const requestRef = useRef(0);
	const loadListing = useCallback(
		async (dir: string, nextSelection?: Set<string>) => {
			const request = ++requestRef.current;
			setListing((prev) => ({ ...prev, loading: true, error: null }));
			try {
				const result = await window.api.listEntries(dir, listOptions);
				if (request !== requestRef.current) return;
				setListing({ ...result, loading: false, error: null });
				const existing = new Set(result.entries.map((entry) => entry.path));
				setSelection(
					(prev) => new Set([...(nextSelection ?? prev)].filter((p) => existing.has(p))),
				);
			} catch (error) {
				if (request !== requestRef.current) return;
				setListing({
					...EMPTY_LISTING,
					error: t("list.error", { detail: (error as Error).message }),
				});
			}
		},
		[listOptions, t],
	);

	useEffect(() => {
		if (currentDir) void loadListing(currentDir);
	}, [currentDir, loadListing]);

	const refreshUndo = useCallback(async () => setCanUndo(await window.api.canUndo()), []);

	// --- Navegação -----------------------------------------------------------
	const navigate = useCallback(
		async (input: string) => {
			// O processo principal valida e devolve o caminho canônico ("c:/users" → "C:\Users").
			const path = await window.api.resolveDirectory(expandHomeShortcut(input, home));
			if (!path) {
				setMessage({ kind: "error", text: t("navigation.notFound", { path: input }) });
				return;
			}
			if (path === currentDir) return;
			setMessage(null);
			setSelection(new Set());
			setListing(EMPTY_LISTING);
			setCurrentDir(path);
		},
		[currentDir, home, setCurrentDir, t],
	);

	/**
	 * Abre itens vindos de fora (arrastar e soltar, menu de contexto do sistema).
	 * `open` com uma pasta entra nela; nos demais casos, abre a pasta onde os itens
	 * estão, com eles selecionados. Itens de outras pastas são ignorados.
	 */
	const openPaths = useCallback(
		async (paths: string[], mode: LaunchMode) => {
			const [first] = paths;
			if (!first) return;
			if (mode === "open" && paths.length === 1) {
				const folder = await window.api.resolveDirectory(first);
				if (folder) {
					await navigate(folder);
					return;
				}
			}
			const parent = await window.api.resolveDirectory(parentPath(first));
			if (!parent) {
				setMessage({ kind: "error", text: t("launch.failed") });
				return;
			}
			// Monta os caminhos a partir da pasta canônica, igual aos da listagem.
			const selected = paths
				.filter((path) => platformPaths.equals(parentPath(path), parentPath(first)))
				.map((path) => joinPath(parent, baseName(path)));

			// Liga os filtros que esconderiam itens pedidos (pastas, ocultos com ponto).
			const hasFolder = (
				await Promise.all(selected.map((path) => window.api.resolveDirectory(path)))
			).some(Boolean);
			const hasDotFile =
				window.api.platform !== "win32" && selected.some((path) => baseName(path).startsWith("."));
			if ((hasFolder && !filters.folders) || (hasDotFile && !filters.hidden)) {
				setFilters((prev) => ({
					...prev,
					folders: prev.folders || hasFolder,
					hidden: prev.hidden || hasDotFile,
				}));
			}
			await navigate(parent);
			setSelection(new Set(selected));
		},
		[filters.folders, filters.hidden, navigate, setFilters, t],
	);

	const openDroppedPaths = useCallback((paths: string[]) => openPaths(paths, "open"), [openPaths]);

	// Itens do menu de contexto do sistema / linha de comando: os que abriram o app e os
	// que chegam com ele aberto. Espera a pasta inicial para não ser sobrescrito por ela.
	const openPathsRef = useRef(openPaths);
	openPathsRef.current = openPaths;
	useEffect(() => {
		if (!initialized) return;
		const unsubscribe = window.api.onLaunchRequest(
			(request) => void openPathsRef.current(request.paths, request.mode),
		);
		void window.api.takeLaunchRequests().then((requests) => {
			const last = requests.at(-1);
			if (last) void openPathsRef.current(last.paths, last.mode);
		});
		return unsubscribe;
	}, [initialized]);

	const refresh = useCallback(() => {
		if (!currentDir) return;
		void loadListing(currentDir);
		void refreshTree([currentDir]);
	}, [currentDir, loadListing, refreshTree]);

	/** Atualiza uma pasta da árvore (e a lista, se for a pasta atual). */
	const refreshFolder = useCallback(
		(path: string) => {
			void refreshTree([path]);
			if (platformPaths.equals(path, currentDir)) void loadListing(currentDir);
		},
		[currentDir, loadListing, refreshTree],
	);

	const toggleHidden = useCallback(
		() => setFilters((prev) => ({ ...prev, hidden: !prev.hidden })),
		[setFilters],
	);

	// --- Lista visível e pré-visualização ------------------------------------
	const visibleEntries = useMemo(() => {
		const matches = createMaskFilter(filters.mask);
		return sortEntries(
			listing.entries.filter((entry) => matches(entry.name)),
			sort,
		);
	}, [listing.entries, filters.mask, sort]);

	const selectedEntries = useMemo(
		() => visibleEntries.filter((entry) => selection.has(entry.path)),
		[visibleEntries, selection],
	);

	/** Exemplos para o construtor de RegEx: os selecionados ou, sem seleção, os primeiros da lista. */
	const sampleNames = useMemo(
		() =>
			(selectedEntries.length > 0 ? selectedEntries : visibleEntries)
				.slice(0, 8)
				.map((e) => e.name),
		[selectedEntries, visibleEntries],
	);

	const deferredOptions = useDeferredValue(options);
	const preview = useMemo(
		() => buildPreview(selectedEntries, listing.entries, deferredOptions, PREVIEW_CONTEXT),
		[selectedEntries, listing.entries, deferredOptions],
	);

	// --- Ações ---------------------------------------------------------------
	const applyResult = useCallback(
		async (result: RenameResult, successText: (count: number) => string) => {
			if (!result.ok) {
				setMessage({ kind: "error", text: describeRenameFailure(result, t) });
				return;
			}
			const moved = new Map(result.renamed.map((op) => [op.from, op.to]));
			const nextSelection = new Set([...selection].map((path) => moved.get(path) ?? path));
			setMessage({ kind: "success", text: successText(result.renamed.length) });
			if (currentDir) await loadListing(currentDir, nextSelection);
			await refreshTree(result.renamed.map((op) => parentPath(op.to)));
		},
		[selection, currentDir, loadListing, refreshTree, t],
	);

	const rename = useCallback(async () => {
		// Recalcula com as opções atuais (a pré-visualização pode estar adiada).
		const fresh = buildPreview(selectedEntries, listing.entries, options, PREVIEW_CONTEXT);
		if (fresh.configError) {
			setMessage({ kind: "error", text: tr(fresh.configError) });
			return;
		}
		if (fresh.errors > 0) {
			setMessage({
				kind: "error",
				text: t("rename.fixConflicts", { count: fresh.errors }),
			});
			return;
		}
		const operations: RenameOperation[] = selectedEntries.flatMap((entry) => {
			const item = fresh.items.get(entry.path);
			return item?.status === "ok"
				? [{ from: entry.path, to: joinPath(entry.dir, item.newName) }]
				: [];
		});
		if (operations.length === 0) {
			setMessage({ kind: "info", text: t("preview.nothingToChange") });
			return;
		}

		const sample = operations
			.slice(0, 6)
			.map((op) => `${baseName(op.from)}  →  ${baseName(op.to)}`)
			.join("\n");
		const confirmed = await window.api.confirm({
			message: t("rename.confirm", { count: operations.length }),
			detail:
				operations.length > 6
					? `${sample}\n${t("rename.confirmMore", { count: operations.length - 6 })}`
					: sample,
			confirmLabel: t("actions.rename"),
		});
		if (!confirmed) return;

		setBusy(true);
		try {
			const result = await window.api.rename(operations);
			await applyResult(result, (count) => t("rename.done", { count }));
		} finally {
			setBusy(false);
			await refreshUndo();
		}
	}, [selectedEntries, listing.entries, options, applyResult, refreshUndo, t, tr]);

	const undo = useCallback(async () => {
		const confirmed = await window.api.confirm({
			message: t("undo.confirm"),
			confirmLabel: t("actions.undo"),
		});
		if (!confirmed) return;
		setBusy(true);
		try {
			const result = await window.api.undo();
			await applyResult(result, (count) => t("undo.done", { count }));
		} finally {
			setBusy(false);
			await refreshUndo();
		}
	}, [applyResult, refreshUndo, t]);

	const changeOption = useCallback(
		<K extends RenameSection>(section: K, patch: Partial<RenameOptions[K]>) => {
			setOptions((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
		},
		[setOptions],
	);

	const resetOption = useCallback(
		(section: RenameSection) => {
			setOptions((prev) => ({ ...prev, [section]: createDefaultOptions()[section] }));
		},
		[setOptions],
	);

	const summary = describePreview(preview, selection.size, t);

	// --- Operações de arquivo (menus de contexto e atalhos) -----------------
	const prompt = useTextPrompt();

	/** Recarrega o que mudou e corrige a pasta atual se ela foi renomeada, movida ou apagada. */
	const handleFileChange = useCallback(
		async (change: FileChange) => {
			let nextDir = currentDir;
			for (const op of change.renamed ?? []) {
				if (platformPaths.contains(op.from, nextDir))
					nextDir = op.to + nextDir.slice(op.from.length);
			}
			for (const removed of change.removed ?? []) {
				if (platformPaths.contains(removed, nextDir)) nextDir = parentPath(removed);
			}
			if (nextDir !== currentDir) {
				setSelection(new Set());
				setCurrentDir(nextDir);
			} else if (currentDir) {
				await loadListing(currentDir, change.select ? new Set(change.select) : undefined);
			}
			await refreshTree(change.dirs);
			await refreshUndo();
		},
		[currentDir, loadListing, refreshTree, refreshUndo, setCurrentDir],
	);

	const operations = useFileOperations({
		ask: prompt.ask,
		notify: setMessage,
		onChanged: handleFileChange,
	});

	const rootPaths = useMemo(() => roots.map((root) => root.path), [roots]);
	const draggingFiles = useFileDrop({
		onDrop: openDroppedPaths,
		enabled: prompt.request === null && !settingsOpen,
	});

	const commands = useFileCommands({
		currentDir,
		visibleEntries,
		selectedEntries,
		selection,
		setSelection,
		rootPaths,
		showHidden: filters.hidden,
		toggleHidden,
		navigate,
		refresh,
		refreshFolder,
		operations,
		shortcutsEnabled: prompt.request === null && !settingsOpen,
	});

	// --- Layout --------------------------------------------------------------
	const startTreeResize = useResizableSplitter({
		axis: "x",
		value: layout.treeWidth,
		min: 160,
		max: 600,
		onChange: (treeWidth) => setLayout((prev) => ({ ...prev, treeWidth })),
	});
	// A área de filtros pode ocupar até metade da área de trabalho. O valor salvo é
	// preservado: se a janela encolher, a área encolhe junto e volta ao crescer.
	const workspaceRef = useRef<HTMLDivElement>(null);
	const workspaceHeight = useElementHeight(workspaceRef);
	const maxPanelsHeight = Math.max(
		MIN_PANELS_HEIGHT,
		Math.floor(workspaceHeight * MAX_PANELS_FRACTION),
	);
	const panelsHeight = Math.min(Math.max(layout.panelsHeight, MIN_PANELS_HEIGHT), maxPanelsHeight);

	const startPanelsResize = useResizableSplitter({
		axis: "y",
		value: panelsHeight,
		min: MIN_PANELS_HEIGHT,
		max: maxPanelsHeight,
		direction: -1,
		onChange: (panelsHeight) => setLayout((prev) => ({ ...prev, panelsHeight })),
	});

	return (
		<div className="app">
			<NavigationToolbar
				currentDir={currentDir || null}
				onNavigate={navigate}
				onUp={() => currentDir && navigate(parentPath(currentDir))}
				onHome={() => home && navigate(home)}
				onRefresh={refresh}
				onPickFolder={async () => {
					const picked = await window.api.pickFolder(currentDir || home || "");
					if (picked) await navigate(picked);
				}}
				onSelectAll={() => setSelection(new Set(visibleEntries.map((entry) => entry.path)))}
				onSelectNone={() => setSelection(new Set())}
				showHidden={filters.hidden}
				onToggleHidden={toggleHidden}
				onOpenSettings={() => setSettingsOpen(true)}
				onInvert={() =>
					setSelection(
						new Set(visibleEntries.filter((e) => !selection.has(e.path)).map((e) => e.path)),
					)
				}
			/>

			<div
				ref={workspaceRef}
				className="workspace"
				style={{ gridTemplateRows: `minmax(0, 1fr) 5px ${panelsHeight}px` }}
			>
				<div
					className="browser"
					style={{ gridTemplateColumns: `${layout.treeWidth}px 5px minmax(0, 1fr)` }}
				>
					<FolderTreeView
						roots={roots}
						tree={tree}
						currentDir={currentDir || null}
						onSelect={navigate}
						onContextMenu={commands.openFolderMenu}
					/>
					<div className="splitter vertical" onPointerDown={startTreeResize} />
					<FileListView
						entries={visibleEntries}
						selection={selection}
						preview={preview}
						rootDir={currentDir}
						showDirColumn={filters.subfolders}
						sort={sort}
						loading={listing.loading}
						error={listing.error}
						onSortChange={setSort}
						onSelectionChange={setSelection}
						onOpen={(entry) =>
							entry.isDir ? navigate(entry.path) : operations.openFile(entry.path)
						}
						onContextMenu={commands.openListMenu}
					/>
				</div>
				<div
					className="splitter horizontal"
					title={t("layout.panelsSplitter")}
					onPointerDown={startPanelsResize}
				/>
				<RenameOptionsPanels
					options={options}
					onChange={changeOption}
					onReset={resetOption}
					filters={filters}
					onFiltersChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
					sampleNames={sampleNames}
					actions={{
						canRename: preview.changed > 0 && preview.errors === 0 && !preview.configError,
						canUndo,
						busy,
						summary,
						onRename: rename,
						onUndo: undo,
						onResetAll: () => setOptions(createDefaultOptions()),
					}}
				/>
			</div>

			<RenameStatusBar
				appInfo={appInfo}
				total={visibleEntries.length}
				selected={selectedEntries.length}
				changed={preview.changed}
				errors={preview.errors}
				truncated={listing.truncated}
				message={message}
				update={updates.announced}
			/>
			<TextPromptDialog request={prompt.request} onClose={prompt.close} />
			<SettingsDialog
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				theme={theme.mode}
				onThemeChange={theme.setMode}
				updates={updates}
				renameOptions={options}
			/>
			{draggingFiles && <DropOverlay />}
		</div>
	);
}
