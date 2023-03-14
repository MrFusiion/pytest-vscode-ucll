import {
    tests,
    TestItem,
    TestController,
    TestRunProfile,
    TestRunProfileKind,
    TestRunRequest,
    CancellationToken,
    ExtensionContext,
    window
} from "vscode";
import { TestFinder } from "./TestFinder";
import { Disposable } from "../util/Disposable";
import { TestOutput } from "./TestOuput";
import { TestWorkerManager } from "./TestWorkerManager";
import Janitor from "../util/Janitor";

export class TestProvider extends Disposable {
    
    private _context: ExtensionContext;
    private _controller: TestController;
    private _runProfile: TestRunProfile;
    private _debugProfile: TestRunProfile;

    public constructor(context: ExtensionContext) {
        super();

        this._context = context;
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
 
    private async runTests(shouldDebug: boolean, request: TestRunRequest, token: CancellationToken): Promise<void> {

        const run = this._controller.createTestRun(request);
        const output = new TestOutput(run);

        const janitor = new Janitor(() => {
            run.end();
        });

        const testWorkerManager = janitor.register(new TestWorkerManager(this._context));

        // janitor.register(testWorkerManager.onDidQueueTestItem(e => {
        //     if (e.test) {
        //         run.enqueued(e.test);
        //     }
        // }));

        janitor.register(testWorkerManager.onDidWorkerStartTestItem(e => {
            if (e.test) {
                run.started(e.test);
            }
        }));

        janitor.register(testWorkerManager.onDidWorkerCompleteTestItem(e => {
            if (e.test) {
                const result = e.result;
                if (result.didPass) {
                    run.passed(e.test, e.result.duration);
                } else if (result.didFail) {
                    run.failed(e.test, result.errors.map(error => error.getTestMessage(e.test.uri!)), e.result.duration);
                } else if (result.didError) {
                    run.errored(e.test, result.errors.map(error => error.getTestMessage(e.test.uri!)), e.result.duration);
                }
                output.appendTestItemResult(e.test, e.result);
            }
        }));

        const include: TestItem[] = [];
        if (request.include) {
            include.push(...request.include);
        } else {
            this._controller.items
                .forEach(test => include.push(test));
        }

        testWorkerManager.registerTestItems(include, request.exclude ?? [])

        try {
            await testWorkerManager.runTests(shouldDebug, token);
        }
        catch (e: any) {
            window.showErrorMessage(e.message);
        }
        finally {
            janitor.dispose();
        }
    }

    public getRunProfile(): TestRunProfile {
        return this._runProfile;
    }

    public getDebugProfile(): TestRunProfile {
        return this._debugProfile;
    }
}