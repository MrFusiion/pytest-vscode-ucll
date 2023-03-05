import { TestItem, EventEmitter, ExtensionContext } from "vscode";
import { Disposable } from "../util/Disposable";
import { TestWorker } from "./TestWorker";
import { IPyTestResult } from "../PyTestFile";
import { Configuration } from "../Configuration";
import { cpus } from "os";

export class NoAvailableWorkersError extends Error {};

export interface IWorkerCompleteTestItemEvent {
    worker: TestWorker;
    test: TestItem;
    result: IPyTestResult;
}

export class TestWorkerManager extends Disposable {

    private _workers: TestWorker[] = [];

    private readonly _onDidWorkerCompleteTestItem = this._register(new EventEmitter<IWorkerCompleteTestItemEvent>());

    public readonly onDidWorkerCompleteTestItem = this._onDidWorkerCompleteTestItem.event;

    constructor(context: ExtensionContext) {
        super();

        this._workers = [];
        for (let i = 0; i < this.maxWorkers; i++) {
            const worker = new TestWorker(context);
            this._register(worker.onDidCompleteTestItem((e) => {
                this._onDidWorkerCompleteTestItem.fire({
                    worker: worker,
                    test: e.test,
                    result: e.result
                });
            }));
            this._workers.push(worker);
        }
    }

    public async runTestItem(test: TestItem, shouldDebug: boolean): Promise<IPyTestResult> {
        let worker = this._workers.find(w => !w.busy);
        if (!worker) {
            throw new NoAvailableWorkersError();
        }
        return await worker.runTestItem(test, shouldDebug);
    }

    public async waitForWorker() {
        return new Promise<void>(resolve => {
            const disposable = this.onDidWorkerCompleteTestItem(() => {
                resolve();
                disposable.dispose();
            });
        });
    }

    public async waitForAllWorkers() {
        return new Promise<void>(resolve => {
            const disposable = this.onDidWorkerCompleteTestItem(() => {
                if (!this.busy) {
                    resolve();
                    disposable.dispose();
                }
            });
        });
    }

    public get busy() {
        return this._workers.every(w => w.busy);
    }

    public get isWorking() {
        return this._workers.some(w => w.busy);
    }

    public get maxWorkers(): number {
        const cores = Math.floor(cpus().length / 2);
        const want = Configuration.getValue<number>("vscode.pytest.ucll.totalTestWorkers") || 5;
        return Math.max(1, Math.min(cores, want));
    }
}