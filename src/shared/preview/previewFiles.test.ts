import { describe, expect, it } from "vitest";
import { localFilePath, localFileUrl } from "./previewFiles";

describe("localFileUrl / localFilePath", () => {
	it.each([
		"/home/ana/Vídeos/férias #1 (2026).mp4",
		"C:\\Users\\Ana\\Vídeos\\a%20b.mkv",
		"/tmp/100% real?.pdf",
	])("ida e volta: %s", (path) => {
		expect(localFilePath(localFileUrl(path))).toBe(path);
	});

	it("recusa outros endereços", () => {
		expect(localFilePath("file:///etc/passwd")).toBeNull();
		expect(localFilePath("rename-plus-file://file/%E0%A4%A")).toBeNull();
	});
});
