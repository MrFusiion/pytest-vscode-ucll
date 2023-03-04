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
            cwd,
            windowsHide: true,
            env: { FORCE_COLOR: "true", }
        });
    }
    
    public async result(): Promise<IShellResult> {
        return new Promise((resolve, reject) => {
            const stdout: string[] = [];
            const stderr: string[] = [];

            this._process.stdout.on("data", (data: Buffer) => {
                stdout.push(data.toString());
            });

            this._process.stderr.on("data", (data: Buffer) => {
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