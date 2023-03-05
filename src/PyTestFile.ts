import { Uri } from "vscode";
import * as path from "path";
import { Shell } from "./Shell";
import { PyTestResult } from "./PyTestResult";

type PyTestStatus = "passed" | "failed";

export interface IPyTestResult {
    readonly status: PyTestStatus;
    readonly message: string;
    readonly duration?: number;
}

export class PyTestFile {

    private readonly _folder: string;

    constructor(uri: Uri) {
        this._folder = path.dirname(uri.fsPath);
    }

    public async run(shouldDebug: boolean): Promise<IPyTestResult> {
        const shell = new Shell("pytest", this._folder);
        try {
            const result = await shell.result();
            return this.parseResult(result.stdout);
        }
        catch (error: any) {
            return {
                status: "failed",
                message: error.message
            }
        }
    }

    private parseResult(stdout: string): IPyTestResult {
        
        const result = new PyTestResult(stdout);

        if (result.didFail) {
            return {
                status: "failed",
                message: result.text,
                duration: result.time
            };
        } else if (result.didPass) {
            return {
                status: "passed",
                message: result.text,
                duration: result.time
            };
        } else {
            return {
                status: "failed",
                message: [
                    "\u001b[31mUnknown error notify the developer of the extension.\u001b[0m",
                    `didFail: ${result.didFail}, didPass: ${result.didPass}`,
                    `passed: ${result.passed}, failed: ${result.failed}, skipped: ${result.skipped}, errored: ${result.errored}`,
                    `stdout: ${stdout}`
                ].join("\r\n")
            };
        }
    }

    public get studentFile(): Uri {
        return Uri.from({
            scheme: "file",
            path: path.resolve(this._folder, "student.py")
        });
    }

}