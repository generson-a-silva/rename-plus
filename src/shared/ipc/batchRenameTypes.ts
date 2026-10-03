export interface RenameOperation {
	from: string;
	to: string;
}

export interface RenameFailure extends RenameOperation {
	error: string;
}

export interface RenameResult {
	ok: boolean;
	renamed: RenameOperation[];
	failed: RenameFailure[];
}
