import { TestItem, EventEmitter, ExtensionContext, Uri } from "vscode";
import { Worker } from "worker_threads"
import { Configuration } from "../Configuration";
import { IPyTestResult } from "../PyTestFile";
import { Disposable } from "../util/Disposable";

export interface ICompleteTestItemEvent {
    test: TestItem;
    result: IPyTestResult;
}

export class TestWorker extends Disposable {

    private _testItem?: TestItem;
    private _worker: Worker;
    
    private readonly _onDidCompleteTestItem = this._register(new EventEmitter<ICompleteTestItemEvent>());

    public readonly onDidCompleteTestItem = this._onDidCompleteTestItem.event;

    constructor(context: ExtensionContext) {
        super();

        this._worker = new Worker(Uri.joinPath(context.extensionUri, "dist", "test_thread.js").fsPath);
    }

    public async runTestItem(test: TestItem, shouldDebug: boolean): Promise<IPyTestResult> {

        this._testItem = test;

        const result = await this.runTestItemInWorker(test, shouldDebug);

        this._onDidCompleteTestItem.fire({
            test: test,
            result: result
        });

        this._testItem = undefined;

        return result;
    }

    public runTestItemInWorker(test: TestItem, shouldDebug: boolean): Promise<IPyTestResult> {
        return new Promise<IPyTestResult>((resolve, reject) => {

            if (!test.uri) {
                return reject(new Error("Test item does not have a uri"));
            }

            this._worker.postMessage({
                fsPath: test.uri.fsPath,
                shouldDebug: shouldDebug,
                showOnlyResultSummary: Configuration.getValue("vscode.pytest.ucll.showOnlyResultSummary")
            });

            this._worker.once("message", (result: IPyTestResult) => {
                resolve(result);
            });

            this._worker.once("error", (error: Error) => {
                resolve({
                    status: "failed",
                    message: error.message,
                    duration: 0
                });
            });

        }).finally(() => {
            this._worker.removeAllListeners("error");
            this._worker.removeAllListeners("message");
        })
    }

    public get busy(): boolean {
        return !!this._testItem;
    }

    public get testItem(): TestItem | undefined {
        return this._testItem;
    }

    public dispose(): void {
        super.dispose();
        this._worker?.terminate();
    }
}