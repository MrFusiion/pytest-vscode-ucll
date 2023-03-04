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
    Range
} from "vscode";
import { PyTestConfig } from "./PyTestConfig";
import { PyTestFile, IPyTestResult } from "./PyTestFile";

export class TestProvider {
    
    private _controller: TestController;
    private _watchers: FileSystemWatcher[] = [];
    private _runProfile: TestRunProfile;
    private _debugProfile: TestRunProfile;

    public constructor() {
        this._controller = tests.createTestController("pytest-vscode-ucll", "PyTest Programming-2");

        this._controller.resolveHandler = async test => {
            if (!test) {
                await this.discoverWorkspaceFolders();
            }
        };

        this._runProfile = this._controller.createRunProfile("Run", TestRunProfileKind.Run, async (request, token) => {
            await this.runTests(false, request, token);
        });

        this._debugProfile = this._controller.createRunProfile("Debug", TestRunProfileKind.Debug, async (request, token) => {
            await this.runTests(true, request, token);
        });
    }

    private async discoverWorkspaceFolders(): Promise<void> {
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

        this._watchers.push(watcher);
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

    private getType(testItem: TestItem): "file" | "folder" | "unknown" {
        if (testItem.children.size > 0) {
            return "folder";
        } else if (testItem.uri) {
            return "file";
        }
        return "unknown";
    }

    private async runTests(shouldDebug: boolean, request: TestRunRequest, token: CancellationToken): Promise<void> {

        const run = this._controller.createTestRun(request);
        const queue: TestItem[] = []
        const promises: Promise<void>[] = [];

        function push(test: TestItem) {
            queue.push(test);
            run.enqueued(test);
        }

        if (request.include) {
            request.include.forEach(push);
        } else {
            this._controller.items.forEach(push);
        }

        while (queue.length > 0 && !token.isCancellationRequested) {
            const test = queue.pop()!;

            if (request.exclude?.includes(test)) {
                continue;
            }

            switch (this.getType(test)) {
                case "folder":
                    Array.from(test.children)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .reverse()
                        .forEach(([_, test]) => push(test));
                    break;
                case "file":
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

        const result = await file.run(shouldDebug);
        this.appendOutputTestitemResult(run, test, result);

        switch (result.status) {
            case "passed":
                run.passed(test, result.duration);
                break;
            case "failed":
                run.failed(test, [], result.duration);
                break;
        }
    }

    private getTestItemFullLabel(testItem: TestItem): string {
        const label = testItem.label;
        const parent = testItem.parent;
        if (parent && parent.label.match(/\d+-[\w-]+/)) {
            return this.getTestItemFullLabel(parent) + " > " + label;
        }
        return label;
    }

    private appendOutputSeperator(run: TestRun): void {
        run.appendOutput("\r\n");
        run.appendOutput(`\u001b[35m${"=".repeat(90)}\u001b[0m\r\n`);
    }

    private appendOutputTestitemResult(run: TestRun, testItem: TestItem, result: IPyTestResult): void {
        const location = new Location(testItem.uri!, new Position(0, 80)); // TODO maybe interpret the output and find the line number.
        this.appendOutputSeperator(run);

        const label = this.getTestItemFullLabel(testItem);
        run.appendOutput(`\u001b[35m| [${label}]:\u001b[0m\r\n`);

        run.appendOutput(result.message
            .split("\n")
            .map(line => `\u001b[35m|\u001b[0m \t${line}`)
            .join("\n")
        , location, testItem);

        // run.appendOutput(this.formatMessage(result.message, testItem), location, testItem);
        this.appendOutputSeperator(run);
    }

    public getRunProfile(): TestRunProfile {
        return this._runProfile;
    }

    public getDebugProfile(): TestRunProfile {
        return this._debugProfile;
    }

    public dispose(): void {
        this._controller.dispose();
        this._watchers.forEach(watcher => watcher.dispose());
    }
}