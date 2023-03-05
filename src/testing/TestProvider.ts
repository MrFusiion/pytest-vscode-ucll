import {
    tests,
    TestItem,
    TestController,
    TestRunProfile,
    TestRunProfileKind,
    TestRunRequest,
    CancellationToken,
    TestRun,
    window
} from "vscode";
import { TestFinder } from "./TestFinder";
import { Disposable } from "../util/Disposable";
import { TestOutput } from "./TestOuput";
import { TestWorkerManager } from "./TestWorkerManager";

export class TestProvider extends Disposable {
    
    private _controller: TestController;
    private _runProfile: TestRunProfile;
    private _debugProfile: TestRunProfile;
    private _run?: TestRun;

    public constructor() {
        super();

        this._controller = this._register(tests.createTestController("pytest-vscode-ucll", "PyTest Programming-2"));

        const testFinder = new TestFinder(this._controller);

        this._controller.resolveHandler = async test => {
            if (!test) {
                await testFinder.discoverWorkspaceFolders();
            }
        };

        this._runProfile = this._controller.createRunProfile("Run", TestRunProfileKind.Run, async (request, token) => {
            await this.runTests(false, request, token);
        });

        this._debugProfile = this._controller.createRunProfile("Debug", TestRunProfileKind.Debug, async (request, token) => {
            await this.runTests(true, request, token);
        });
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

        if (this._run) {
            window.showErrorMessage("A test run is already in progress");
            return;
        }

        this._run = this._controller.createTestRun(request);
        const output = new TestOutput(this._run);
        const queue: TestItem[] = [];
        const promises: Promise<any>[] = [];

        const testWorkerManager = new TestWorkerManager();

        if (request.include) {
            request.include.forEach(item => queue.push(item));
        } else {
            this._controller.items.forEach(item => queue.push(item));
        }

        while (queue.length > 0 && !token.isCancellationRequested) {
            const test = queue.pop()!;

            if (request.exclude?.includes(test)) {
                continue;
            }

            switch (this.getType(test)) {
                case "folder":
                    Array.from(test.children)
                        .sort(([a], [b]) => a.localeCompare(b) * -1)
                        .forEach(([_, test]) => queue.push(test));
                    break;
                case "file":
                    if (testWorkerManager.busy) {
                        await testWorkerManager.waitForWorker();
                    }
                    this._run?.enqueued(test)
                    promises.push(
                        testWorkerManager.runTestItem(test, shouldDebug)
                            .then(result => {
                                switch (result.status) {
                                    case "passed":
                                        this._run?.passed(test, result.duration);
                                        break;
                                    case "failed":
                                        this._run?.failed(test, [], result.duration);
                                        break;
                                }
                                output.appendTestItemResult(test, result);
                            })
                            .catch(console.error)
                    );
                    break;
                case "unknown":
                    throw new Error("Unexpected Error: TestItem has no uri");
            }
        }

        if (!token.isCancellationRequested) {
            await Promise.all(promises);
        }

        this._run?.end();
        this._run = undefined;
    }

    public getRunProfile(): TestRunProfile {
        return this._runProfile;
    }

    public getDebugProfile(): TestRunProfile {
        return this._debugProfile;
    }
}