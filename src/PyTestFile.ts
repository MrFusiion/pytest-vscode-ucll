import { Uri } from "vscode";
import * as path from "path";
import { Shell } from "./Shell";
import { PyTestSummary } from "./PyTestSummary";

type PyTestStatus = "passed" | "failed";

interface IPyTestResult {
    readonly status: PyTestStatus;
    readonly message: string;
    readonly duration?: number;
}

export class PyTestFile {

    private readonly _folder: string;

    constructor(uri: Uri) {
        this._folder = path.dirname(uri.fsPath);
        console.log(this._folder);
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
        
        const summary = new PyTestSummary(stdout);

        if (summary.didFail) {
            return {
                status: "failed",
                message: summary.text,
                duration: summary.time
            };
        } else if (summary.didPass) {
            return {
                status: "passed",
                message: summary.text,
                duration: summary.time
            };
        } else {
            return {
                status: "failed",
                message: "Unknown error notify the developer of the extension."
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