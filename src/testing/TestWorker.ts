import { TestItem, EventEmitter } from "vscode";
import { PyTestFile, IPyTestResult } from "../PyTestFile";
import { Disposable } from "../util/Disposable";

export interface ICompleteTestItemEvent {
    test: TestItem;
    result: IPyTestResult;
}

export class TestWorker extends Disposable {

    private _testItem?: TestItem;
    
    private readonly _onDidCompleteTestItem = this._register(new EventEmitter<ICompleteTestItemEvent>());

    public readonly onDidCompleteTestItem = this._onDidCompleteTestItem.event;

    public async runTestItem(test: TestItem, shouldDebug: boolean): Promise<IPyTestResult> {
        const file = new PyTestFile(test.uri!);

        this._testItem = test;

        const result = await file.run(shouldDebug);

        this._onDidCompleteTestItem.fire({
            test: test,
            result: result
        });

        this._testItem = undefined;

        return result;
    }

    public get busy(): boolean {
        return !!this._testItem;
    }

    public get testItem(): TestItem | undefined {
        return this._testItem;
    }
}