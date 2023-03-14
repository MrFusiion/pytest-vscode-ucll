import { TestItem, TestRun, Position, Location } from "vscode";
import { IPyTestResult } from "../pytest/PyTestXmlResultParser";

export class TestOutput {

    private _run: TestRun;

    constructor(run: TestRun) {
        this._run = run;
    }

    public async appendTestItemResult(testItem: TestItem, result: IPyTestResult) {
        const location = new Location(testItem.uri!, new Position(0, 80)); // TODO maybe interpret the output and find the line number.
        this.appendOutputSeperator();

        const label = this.getTestItemFullLabel(testItem);
        this._run.appendOutput(`\u001b[35m| [${label}]:\u001b[0m\r\n`);

        this._run.appendOutput(result.message
            .split("\n")
            .map(line => `\u001b[35m|\u001b[0m \t${line}`)
            .join("\n")
        , location, testItem);

        this.appendOutputSeperator();
    }

    private getTestItemFullLabel(testItem: TestItem): string {
        const label = testItem.label;
        const parent = testItem.parent;
        if (parent && parent.label.match(/\d+-[\w-]+/)) {
            return this.getTestItemFullLabel(parent) + " > " + label;
        }
        return label;
    }

    private appendOutputSeperator(): void {
        this._run.appendOutput("\r\n");
        this._run.appendOutput(`\u001b[35m${"=".repeat(90)}\u001b[0m\r\n`);
    }

}