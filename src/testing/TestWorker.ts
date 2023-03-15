import { TestItem, EventEmitter, ExtensionContext, Uri } from "vscode";
import { Worker } from "worker_threads"
import { IPyTestResult, PyTestXmlResultParser } from "../pytest/PyTestXmlResultParser";
import { Disposable } from "../util/Disposable";
import * as tmp from "tmp";
import path = require("path");
import Window from "../util/Window";

export interface ICompleteTestItemEvent {
    test: TestItem;
    result: IPyTestResult;
}
export class TestWorker extends Disposable {

    private static _parser = new PyTestXmlResultParser()

    private _testItem?: TestItem;
    private _file: tmp.FileResult;
    private _worker: Worker;
    
    private readonly _onDidCompleteTestItem = this._register(new EventEmitter<ICompleteTestItemEvent>());

    public readonly onDidCompleteTestItem = this._onDidCompleteTestItem.event;

    constructor(context: ExtensionContext) {
        super();

        this._file = tmp.fileSync({ postfix: ".xml" });
        this._worker = new Worker(Uri.joinPath(context.extensionUri, "dist", "shell_thread.js").fsPath);
    }

    private async _runTest(shouldDebug: boolean): Promise<IPyTestResult> {
        return new Promise<IPyTestResult>((resolve, reject) => {
            if (!this._testItem) {
                throw new Error("No test item to run");
            }

            if (!this._testItem.uri) {
                return reject(new Error("Test item does not have a uri"));
            }

            this._worker.once("message", (result) => {
                resolve(TestWorker._parser.parseResult(this._file.name, result));
            });

            this._worker.once("error", (error: Error) => {
                resolve(PyTestXmlResultParser.errored(error.message));
            });

            this._worker.postMessage({
                cmd: "pytest",
                args: [
                    `--junitxml=${this._file.name}`,
                ],
                options: {
                    shell: false,
                    cwd: path.dirname(this._testItem.uri.fsPath),
                }
            });
        }).finally(() => {
            this._worker.removeAllListeners("error");
            this._worker.removeAllListeners("message");
        })
    }

    public async runTest(test: TestItem, shouldDebug: boolean): Promise<IPyTestResult> {
        if (this._testItem) {
            throw new Error("Test worker is busy");
        }

        let result: IPyTestResult | undefined;
        try {
            this._testItem = test;

            result = await this._runTest(shouldDebug);
    
            this._onDidCompleteTestItem.fire({
                test: test,
                result: result
            });
        }
        catch (e) {
            const message = Window.showErrorMessage(e);
            result = PyTestXmlResultParser.errored(message);
        }
        finally {
            this._testItem = undefined;
        }

        return result;
    }
    
    public get busy(): boolean {
        return !!this._testItem;
    }

    public get testItem(): TestItem | undefined {
        return this._testItem;
    }

    public dispose(): void {
        super.dispose();
        this._file.removeCallback();
        this._worker.terminate();
    }
}