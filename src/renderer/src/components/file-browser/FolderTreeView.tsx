import { AppIcon, type AppIconName } from "@components/common";
import type { FolderTreeState } from "@hooks";
import { useEffect, useRef } from "react";

export interface TreeRoot {
	label: string;
	path: string;
	icon: AppIconName;
}

interface FolderTreeViewProps {
	roots: TreeRoot[];
	tree: FolderTreeState;
	currentDir: string | null;
	onSelect: (path: string) => void;
	onContextMenu: (path: string) => void;
}

interface FolderTreeNodeProps {
	hidden: boolean;
	label: string;
	path: string;
	icon: AppIconName;
	depth: number;
	tree: FolderTreeState;
	currentDir: string | null;
	onSelect: (path: string) => void;
	onContextMenu: (path: string) => void;
}

function FolderTreeNode({
	label,
	path,
	icon,
	depth,
	tree,
	currentDir,
	onSelect,
	onContextMenu,
	hidden,
}: FolderTreeNodeProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isOpen = tree.expanded.has(path);
	const isActive = currentDir === path;
	const children = tree.children.get(path);
	const isEmpty = Array.isArray(children) && children.length === 0;

	useEffect(() => {
		if (isActive) ref.current?.scrollIntoView({ block: "nearest" });
	}, [isActive]);

	return (
		<>
			<div
				ref={ref}
				className={`tree-node${isActive ? " active" : ""}${hidden ? " hidden-item" : ""}`}
				style={{ paddingLeft: 6 + depth * 14 }}
				role="treeitem"
				aria-selected={isActive}
				aria-expanded={isEmpty ? undefined : isOpen}
				tabIndex={-1}
				title={path}
				onClick={() => onSelect(path)}
				onContextMenu={(event) => {
					event.preventDefault();
					onContextMenu(path);
				}}
				onDoubleClick={() => tree.toggle(path)}
				onKeyDown={(event) => {
					if (event.key === "Enter") onSelect(path);
					if (event.key === "ArrowRight" && !isOpen) tree.toggle(path);
					if (event.key === "ArrowLeft" && isOpen) tree.toggle(path);
				}}
			>
				<button
					type="button"
					className={`tree-twisty${isOpen ? " open" : ""}${isEmpty ? " hidden" : ""}`}
					tabIndex={-1}
					aria-label={isOpen ? "Recolher" : "Expandir"}
					onClick={(event) => {
						event.stopPropagation();
						tree.toggle(path);
					}}
				>
					<AppIcon name="chevron" size={12} />
				</button>
				<AppIcon name={icon} size={15} />
				<span className="tree-label">{label}</span>
			</div>
			{isOpen && children === "loading" && (
				<div className="tree-loading" style={{ paddingLeft: 26 + (depth + 1) * 14 }}>
					Carregando…
				</div>
			)}
			{isOpen &&
				Array.isArray(children) &&
				children.map((child) => (
					<FolderTreeNode
						key={child.path}
						label={child.name}
						path={child.path}
						icon="folder"
						depth={depth + 1}
						tree={tree}
						currentDir={currentDir}
						onSelect={onSelect}
						onContextMenu={onContextMenu}
						hidden={child.hidden}
					/>
				))}
		</>
	);
}

/** Árvore de pastas (painel esquerdo), com subpastas carregadas sob demanda. */
export function FolderTreeView({
	roots,
	tree,
	currentDir,
	onSelect,
	onContextMenu,
}: FolderTreeViewProps) {
	return (
		<div className="folder-tree" role="tree" aria-label="Pastas">
			{roots.map((root) => (
				<FolderTreeNode
					key={root.path}
					label={root.label}
					path={root.path}
					icon={root.icon}
					depth={0}
					tree={tree}
					currentDir={currentDir}
					onSelect={onSelect}
					onContextMenu={onContextMenu}
					hidden={false}
				/>
			))}
		</div>
	);
}
