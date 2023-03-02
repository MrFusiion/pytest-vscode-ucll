import { Uri, workspace } from "vscode";
import * as path from "path";
import { exec, ExecException } from "child_process";

const FAILED_REGEX = /FAILED\s(.*)/;
const ERROR_REGEX = /ERROR\s(.*)/;
const SKIPPED_REGEX = /SKIPPED\s(.*)/;
const TIME_REGEX = /\d+\s[\w]+\sin\s(\d+\.\d+)s/;
const SUMMARY_REGEX = /[=]+\s[\w ]+\s[=]+.(.+)/s;

type PyTestStatus = "+" | "-" | "s";

interface IPyTestResult {
    readonly status: PyTestStatus;
    readonly message: string;
    readonly duration?: number;
}

export class PyTestFile {

    private readonly path: string;
    private readonly folder: string;
    private readonly file: string;

    constructor(uri: Uri) {
        this.path = uri.fsPath;
        this.folder = path.dirname(uri.fsPath);
        this.file = path.basename(uri.fsPath);
    }

    public async run(shouldDebug: boolean): Promise<IPyTestResult> {
        return new Promise((resolve, reject) => {
            exec(`pytest ${this.path}`, {
                cwd: this.folder
            }, (error, stdout, stderr) => {
                resolve(this.parseResult(stdout, error));
                //workspace.fs.writeFile(Uri.from({ scheme: "file", path: path.resolve(this.folder, "output.txt") }), Buffer.from(stdout));
            });
        });
    }

    private parseResultTime(stdout: string): number | undefined {
        const match = stdout.match(TIME_REGEX);
        if (match) {
            return parseFloat(match[1]) * 1000;
        } else {
            return undefined;
        }
    }

    private parseResult(stdout: string, error: ExecException | null): IPyTestResult {
        const failed = error || !!stdout.match(FAILED_REGEX) || !!stdout.match(ERROR_REGEX);
        const skipped = !!stdout.match(SKIPPED_REGEX)
        const message = error?.message || stdout;
        if (failed) {
            return {
                status: "-",
                message: this.parseSummary(message),
                duration: this.parseResultTime(message)
            };
        } else if (skipped) {
            return {
                status: "s",
                message: this.parseSummary(message),
                duration: this.parseResultTime(message)
            };
        } else {
            return {
                status: "+",
                message: "",
                duration: this.parseResultTime(message)
            };
        }
    }

    private parseSummary(stdout: string): string {
        const match = stdout.match(SUMMARY_REGEX);
        if (match) {
            return [
                "=".repeat(60),
                match[1],
                "=".repeat(60)
            ].join("\n");
        }
        return stdout;
    }

    public get studentFile(): Uri {
        return Uri.from({
            scheme: "file",
            path: path.resolve(this.folder, "student.py")
        });
    }

}