import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export interface IShellResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly code: number | null;
}

export class Shell {

    private process: ChildProcessWithoutNullStreams;

    constructor(cmd: string, cwd?: string) {
        this.process = spawn(cmd, {
            shell: false,
            cwd
        });
        this.process.stdout.setEncoding("utf8");
        this.process.stderr.setEncoding("utf8");
    }

    
    public async result(): Promise<IShellResult> {
        return new Promise((resolve, reject) => {
            const stdout: string[] = [];
            const stderr: string[] = [];

            this.process.stdout.on("data", (data) => {
                stdout.push(data.toString());
            });

            this.process.stderr.on("data", (data) => {
                stderr.push(data.toString());
            });

            this.process.on("close", (code) => {
                resolve({
                    stdout: stdout.join(""),
                    stderr: stderr.join(""),
                    code: code
                });
            });

            this.process.on("error", (error) => {
                reject(error);
            });
        });
    }

}