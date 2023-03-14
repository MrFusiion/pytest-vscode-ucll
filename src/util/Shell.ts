import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export interface IShellResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly code: number | null;
}

export interface IShellOptions {
    readonly cwd?: string;
    readonly env?: NodeJS.ProcessEnv;
    readonly shell?: boolean;
}

export class Shell {

    private _process: ChildProcessWithoutNullStreams;

    constructor(cmd: string, options?: IShellOptions);
    constructor(cmd: string, args?: string[], options?: IShellOptions)
    constructor(...args: any[]) {
        let [cmd, cmdArgs, options] = args;
        
        if (typeof cmdArgs === "object" && !Array.isArray(cmdArgs)) {
            options = cmdArgs;
            cmdArgs = [];
        }

        options = options || {};
        options.env = options.env || {};

        this._process = spawn(cmd, cmdArgs, {
            shell: options.shell ?? false,
            cwd: options?.cwd,
            windowsHide: true,
            env: {
                ...options.env,
                FORCE_COLOR: "true"
            }
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