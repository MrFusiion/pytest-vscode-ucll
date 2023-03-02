import {
    tests,
    TestItem,
    TestController,
    FileSystemWatcher,
    workspace,
    TestRunProfile,
    TestRunProfileKind,
    TestRunRequest,
    CancellationToken,
    WorkspaceFolder,
    RelativePattern,
    Uri,
    TestRun,
    Location,
    Position,
} from "vscode";
import * as path from "node:path";
import { PyTestConfig } from "./PyTestConfig";
import { PyTestFile } from "./PyTestFile";
import { alignCenter } from "./utils/align";

export class TestProvider {
    
    private controller: TestController;
    private watchers: FileSystemWatcher[] = [];
    private runProfile: TestRunProfile;
    private debugProfile: TestRunProfile;

    public constructor() {
        this.controller = tests.createTestController("pytest-vscode-ucll", "PyTest Programming-2");

        this.controller.resolveHandler = async test => {
            if (!test) {
                await this.discoverWorkspaceFolders();
            }
        };

        this.runProfile = this.controller.createRunProfile("Run", TestRunProfileKind.Run, async (request, token) => {
            await this.runTests(false, request, token);
        });

        this.debugProfile = this.controller.createRunProfile("Debug", TestRunProfileKind.Debug, async (request, token) => {
            await this.runTests(true, request, token);
        });
    }

    private async discoverWorkspaceFolders(): Promise<void> {
        if (!workspace.workspaceFolders) {
            return;
        }

        await Promise.all(
            workspace.workspaceFolders.map(async folder => {

                const item = this.controller.createTestItem(folder.name, folder.name, folder.uri);

                this.controller.items.add(item);

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

        this.watchers.push(watcher);
    }

    private async getOrCreateTestItem(uri: Uri, testItem: TestItem): Promise<TestItem> {

        if (!testItem.uri) {
            throw new Error("Unexpected Error: TestItem has no uri");
        }

        const controller = this.controller;

        const relPath = path.relative(testItem.uri.fsPath, uri.fsPath);

        function helper(paths: string[], testItem: TestItem): TestItem {
            if (paths.length === 0) {
                return testItem;
            }

            const path = paths.shift();
            const isNextFile = paths?.[0]?.endsWith(".py");

            if (!path) {
                throw new Error("Unexpected Error: path is empty");
            } else if (path.endsWith(".py")) {
                return testItem;
            }

            const existing = testItem.children.get(path);
            if (existing) {
                return helper(paths, existing);
            }

            const item = controller.createTestItem(path, path, isNextFile ? uri : undefined);

            testItem.children.add(item);

            return helper(paths, item);
        }

        return helper(relPath.split(path.sep), testItem);
    }

    private getType(testItem: TestItem): "file" | "folder" | "unknown" {
        if (testItem.children.size > 0) {
            return "folder";
        } else if (testItem.uri) {
            return "file";
        }
        return "unknown";
    }

    private async runTests(shouldDebug: boolean, request: TestRunRequest, token: CancellationToken): Promise<void> {

        const run = this.controller.createTestRun(request);
        const queue: TestItem[] = []
        const promises: Promise<void>[] = [];

        function push(test: TestItem) {
            queue.push(test);
            run.enqueued(test);
        }

        if (request.include) {
            request.include.forEach(push);
        } else {
            this.controller.items.forEach(push);
        }

        while (queue.length > 0 && !token.isCancellationRequested) {
            const test = queue.pop()!;

            if (request.exclude?.includes(test)) {
                continue;
            }

            switch (this.getType(test)) {
                case "folder":
                    test.children.forEach(push);
                    break;
                case "file":
                    // promises.push(this.runTest(test, run, shouldDebug));
                    await this.runTest(test, run, shouldDebug);
                    break; 
                case "unknown":
                    throw new Error("Unexpected Error: TestItem has no uri");
            }
        }

        await Promise.all(promises);

        run.end();
    }

    private async runTest(test: TestItem, run: TestRun, shouldDebug: boolean): Promise<void> {

        const file = new PyTestFile(test.uri!);
        run.started(test);

        const result = await file.run(shouldDebug)
        switch (result.status) {
            case "+":
                run.passed(test, result.duration);
                break;
            case "-":
            case "s":
                const location = new Location(file.studentFile, new Position(0, 0));

                // run.appendOutput(this.parseMessage(test, result.message), location, test);
                run.appendOutput(result.message, location, test);
                run.failed(test, [], result.duration);
                // run.skipped(test);
                break;
        }
    }

    // private parseMessage(item: TestItem, message: string): string {
    //     const width = 80;
    //     return [
    //         // "=".repeat(width),
    //         // alignCenter(` ${item.label} `, width, "="),
    //         message,
    //         "=".repeat(width),
    //         "\n"
    //     ].join("\n");
    //     return message;
    // }

    public getRunProfile(): TestRunProfile {
        return this.runProfile;
    }

    public getDebugProfile(): TestRunProfile {
        return this.debugProfile;
    }

    public dispose(): void {
        this.controller.dispose();
        this.watchers.forEach(watcher => watcher.dispose());
    }
}