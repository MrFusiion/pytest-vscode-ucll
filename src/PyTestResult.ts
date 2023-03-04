import { Configuration } from "./Configuration";

const PASSED_REGEX = /(\d+) passed/;
const SKIPPED_REGEX = /(\d+) skipped/;
const FAILED_REGEX = /(\d+) failed/;
const ERROR_REGEX = /(\d+) error/;
const TIME_REGEX = /(\d+\.\d+)s/;
const SUMMARY_REGEX = /=+\sshort test summary info\s=+/;

export class PyTestResult {

    private _text: string;
    private _time: number;

    private _passed: number;
    private _skipped: number;
    private _failed: number;
    private _errored: number;

    constructor(stdout: string) {

        let lines = stdout.split("\n");

        if (Configuration.getValue("vscode.pytest.ucll.showOnlyResultSummary")) {
            while (lines.length > 0) {
                const line = lines.shift() || "";
                if (line.match(SUMMARY_REGEX)) {
                    break;
                }
            }
        }

        if (lines.length === 0) {
            lines = stdout.split("\n");
        }

        this._time = 0;
        this._passed = 0;
        this._skipped = 0;
        this._failed = 0;
        this._errored = 0;

        while (lines.length > 0) {
            const line = lines.pop() || "";
            
            const timeMatch = line.match(TIME_REGEX);
            if (timeMatch) {
                lines.push(line);

                this._time = parseFloat(timeMatch[1]) * 1000;
                this._passed = this.getStat(PASSED_REGEX, line);
                this._skipped = this.getStat(SKIPPED_REGEX, line);
                this._failed = this.getStat(FAILED_REGEX, line);
                this._errored = this.getStat(ERROR_REGEX, line);
                break;
            }
        }

        this._text = lines.join("\n");
    }

    private getStat(regex: RegExp, stdout: string): number {
        const match = stdout.match(regex);
        return match ? parseInt(match[1]) : 0;
    }

    public get didFail(): boolean {
        return this._failed > 0 || this._errored > 0 || this._skipped > 0;
    }

    public get didPass(): boolean {
        return this._passed > 0;
    }

    public get passed(): number {
        return this._passed;
    }

    public get skipped(): number {
        return this._skipped;
    }

    public get failed(): number {
        return this._failed;
    }

    public get errored(): number {
        return this._errored;
    }

    public get time(): number {
        return this._time;
    }

    public get text(): string {
        return this._text;
    }

}