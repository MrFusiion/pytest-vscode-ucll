import { WorkspaceFolder, TestItem, TestController, RelativePattern, Uri, Range, Position, workspace } from "vscode";
import { Disposable } from "../util/Disposable";
import { PyTestConfig } from "../PyTestConfig";

export class TestFinder extends Disposable {

    private _controller: TestController;

    constructor(controller: TestController) {
        super();

        this._controller = controller;
    }

    public async discoverWorkspaceFolders(): Promise<void> {
        if (!workspace.workspaceFolders) {
            return;
        }

        await Promise.all(
            workspace.workspaceFolders.map(async folder => {

                const item = this._controller.createTestItem(folder.name, folder.name, folder.uri);

                this._controller.items.add(item);

                this.discoverWorkspaceFolderFiles(folder, item);
            }
        ));
    }

    private async discoverWorkspaceFolderFiles(folder: WorkspaceFolder, item: TestItem): Promise<void> {
        const config = new PyTestConfig(folder);
        const testFiles = await config.get("python_files") || "tests.py";

        const pattern = new RelativePattern(folder, "**/" + testFiles);
        const watcher = workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(async uri => this.getOrCreateTestItem(uri, item));

        watcher.onDidChange(async uri => this.getOrCreateTestItem(uri, item));

        // watcher.onDidDelete(uri => this.rootItem.children.delete(uri.toString()));
        //TODO: delete

        for (const uri of await workspace.findFiles(pattern)) {
            this.getOrCreateTestItem(uri, item);
        }

        this._register(watcher);
    }

    private async getOrCreateTestItem(uri: Uri, testItem: TestItem): Promise<TestItem> {

        if (!testItem.uri) {
            throw new Error("Unexpected Error: TestItem has no uri");
        }

        const controller = this._controller;

        const relPath = uri.fsPath.slice(testItem.uri.fsPath.length + 1);

        function helper(paths: string[], testItem: TestItem): TestItem {
            if (paths.length === 0) {
                return testItem;
            }

            const section = paths.shift();
            const isNextFile = paths?.[0]?.endsWith(".py");

            if (!section) {
                throw new Error("Unexpected Error: path is empty");
            } else if (section.endsWith(".py")) {
                return testItem;
            }

            const existing = testItem.children.get(section);
            if (existing) {
                return helper(paths, existing);
            }

            const item = controller.createTestItem(section, section, isNextFile ? uri : undefined);
            item.range = isNextFile ? new Range(new Position(0, 0), new Position(0, 0)) : undefined;

            testItem.children.add(item);

            return helper(paths, item);
        }
        
        return helper(relPath.split("\\"), testItem);
    }
}