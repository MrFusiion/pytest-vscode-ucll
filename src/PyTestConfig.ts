import * as ini from "ini";
import { Uri, WorkspaceFolder, workspace } from "vscode";

export class PyTestConfig {

    private folder: WorkspaceFolder;
    private config?: Record<string, any>;

    public constructor(folder: WorkspaceFolder) {
        this.folder = folder;
    }

    public async read() {
        const contentBytes = await workspace.fs.readFile(Uri.joinPath(this.folder.uri, "pytest.ini"));
        this.config = ini.parse(contentBytes.toString());
    }

    public async get(key: string) {
        if (!this.config) {
            await this.read();
        }

        if (this.config) {
            return this.config["pytest"][key];
        } else {
            throw new Error("Unexpected Error: No config found");
        }
    }

}