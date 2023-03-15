import { TestItem, EventEmitter, ExtensionContext, CancellationToken, window } from "vscode";
import { Disposable } from "../util/Disposable";
import { TestWorker } from "./TestWorker";
import { IPyTestResult } from "../pytest/PyTestXmlResultParser";
import { Configuration } from "../Configuration";
import { cpus } from "os";
import Window from "../util/Window";

export class NoAvailableWorkersError extends Error {};

export interface IWorkerCompleteTestItemEvent {
    worker: TestWorker;
    test: TestItem;
    result: IPyTestResult;
}

export interface IWorkerTestItemEvent {
    worker: TestWorker;
    test: TestItem;
}

export class TestWorkerManager extends Disposable {

    private _workers: TestWorker[] = [];
    private _queue: TestItem[] = [];
    private _run?: { token: CancellationToken, debug: boolean };

    private readonly _onDidWorkerCompleteTestItem = this._register(new EventEmitter<IWorkerCompleteTestItemEvent>());
    private readonly _ondidWorkerStartTestItem = this._register(new EventEmitter<IWorkerTestItemEvent>());
    private readonly _onDidQueueTestItem = this._register(new EventEmitter<IWorkerTestItemEvent>());

    public readonly onDidWorkerCompleteTestItem = this._onDidWorkerCompleteTestItem.event;
    public readonly onDidWorkerStartTestItem = this._ondidWorkerStartTestItem.event;
    public readonly onDidQueueTestItem = this._onDidQueueTestItem.event;

    constructor(context: ExtensionContext) {
        super();

        this._workers = [];
        this._queue = [];

        for (let i = 0; i < this.maxWorkers; i++) {
            this._workers.push(this._register(new TestWorker(context)));
        }
    }

    private getType(testItem: TestItem): "file" | "folder" | "unknown" {
        if (testItem.children.size > 0) {
            return "folder";
        } else if (testItem.uri) {
            return "file";
        }
        return "unknown";
    }

    public registerTestItems(tests: TestItem[], exclude: readonly TestItem[]): void {
        tests = [...tests].sort((a, b) => {
            return a.sortText?.localeCompare(b.sortText ?? "") ?? 0;
        });
        for (const test of tests) {
            this.registerTestItem(test, exclude);
        }
    }

    public registerTestItem(test: TestItem, exclude: readonly TestItem[]): void {
        if (exclude.includes(test)) {
            return;
        }

        switch (this.getType(test)) {
            case "file":
                this._queue.push(test);
                this._onDidQueueTestItem.fire({
                    worker: this._workers[0],
                    test: test
                });
                break;
            case "folder":
                this.registerTestItems([...test.children].map(([_, item]) => item), exclude);
                break;
            case "unknown":
                throw new Error("Test item does not have a uri or children");
        }
    }

    private async _runTests() {
        if (!this._run) {
            throw new Error("No run");
        }

        while (this._queue.length > 0 && !this._run.token.isCancellationRequested) {
            const test = this._queue.shift();
            if (!test) {
                break;
            }

            const worker = await this.getWorker();
            
            this._ondidWorkerStartTestItem.fire({
                worker: worker,
                test: test
            });

            const result = await worker.runTest(test, this._run.debug);

            this._onDidWorkerCompleteTestItem.fire({
                worker: worker,
                test: test,
                result: result
            });
        }
    }

    public async runTests(shouldDebug: boolean, token: CancellationToken): Promise<void> {
        if (this._run) {
            throw new Error("Already running");
        }

        try {
            this._run = { token, debug: shouldDebug };
            await this._runTests();
        }
        catch (e) {
            Window.showErrorMessage(e);
        }
        finally {
            this._run = undefined;
            this._queue = [];
        }
    }

    private async getWorker(): Promise<TestWorker> {
        return this._workers.find(w => !w.busy)
            || await this.waitForWorker();
    }

    private async waitForWorker(): Promise<TestWorker> {
        return new Promise<TestWorker>(resolve => {
            const disposable = this.onDidWorkerCompleteTestItem((e) => {
                resolve(e.worker);
                disposable.dispose();
            });
        });
    }

    public get busy(): boolean {
        return this._workers.every(w => w.busy);
    }

    public get isWorking(): boolean {
        return this._workers.some(w => w.busy);
    }

    public get maxWorkers(): number {
        const cores = Math.floor(cpus().length / 2);
        const want = Configuration.getValue<number>("vscode.pytest.ucll.totalTestWorkers") || 5;
        return Math.max(1, Math.min(cores, want));
    }
}