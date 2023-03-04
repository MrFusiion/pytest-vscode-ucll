import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export interface IShellResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly code: number | null;
}

export class Shell {

    private _process: ChildProcessWithoutNullStreams;

    constructor(cmd: string, cwd?: string) {
        this._process = spawn(cmd, {
            shell: false,
            cwd
        });
        this._process.stdout.setEncoding("utf8");
        this._process.stderr.setEncoding("utf8");
    }

    
    public async result(): Promise<IShellResult> {
        return new Promise((resolve, reject) => {
            const stdout: string[] = [];
            const stderr: string[] = [];

            this._process.stdout.on("data", (data) => {
                stdout.push(data.toString());
            });

            this._process.stderr.on("data", (data) => {
                stderr.push(data.toString());
            });

            this._process.on("close", (code) => {
                resolve({
                    stdout: stdout.join(""),
                    stderr: stderr.join(""),
                    code: code
                });
            });

            this._process.on("error", (error) => {
                reject(error);
            });
        });
    }

}