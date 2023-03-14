import { isMainThread, parentPort } from "worker_threads"
import { Shell, IShellOptions } from "./util/Shell";

export interface ITaskMessage {
    cmd: string;
    args?: string[];
    options?: IShellOptions;
}

if (!isMainThread && parentPort) { // Only run in worker threads and parentPort is defined
    parentPort.on("message", async (message: ITaskMessage) => {

        const { cmd, args, options } = message;

        const shell = new Shell(cmd, args, options);

        parentPort?.postMessage(await shell.result());
    });
}