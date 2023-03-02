import * as ini from "ini";
import * as path from "path";
import { TextDecoder } from "util";
import { Uri, WorkspaceFolder, workspace } from "vscode";

export class PyTestConfig {

    private folder: WorkspaceFolder;
    private config?: Record<string, any>;

    public constructor(folder: WorkspaceFolder) {
        this.folder = folder;
    }

    public async read() {
        const contentBytes = await workspace.fs.readFile(Uri.joinPath(this.folder.uri, "pytest.ini"));
        const content = new TextDecoder().decode(contentBytes);
        this.config = ini.parse(content);
    }

    public async get(key: string) {
        if (!this.config) {
            await this.read();
        }

        if (this.config) {
            return this.config[key];
        } else {
            throw new Error("Unexpected Error: No config found");
        }
    }

}