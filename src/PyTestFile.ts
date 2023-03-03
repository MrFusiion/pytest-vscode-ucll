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

    private readonly path: string;
    private readonly folder: string;
    private readonly file: string;

    constructor(uri: Uri) {
        this.path = uri.fsPath;
        this.folder = path.dirname(uri.fsPath);
        this.file = path.basename(uri.fsPath);
    }

    public async run(shouldDebug: boolean): Promise<IPyTestResult> {
        const shell = new Shell("pytest", this.folder);
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
            path: path.resolve(this.folder, "student.py")
        });
    }

}