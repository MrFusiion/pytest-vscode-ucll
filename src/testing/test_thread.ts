import { isMainThread, parentPort } from "worker_threads"
import { PyTestFile, IPyTestResult } from "../PyTestFile";

export interface ITaskMessage {
    fsPath: string;
    shouldDebug: boolean;
    showOnlyResultSummary: boolean;
}

if (!isMainThread) { // For safety, check if this is not the main thread
    if (parentPort) {
        parentPort.on("message", (message: ITaskMessage) => {

            const { fsPath, shouldDebug, showOnlyResultSummary } = message;
            const pyTestFile = new PyTestFile(fsPath);

            pyTestFile.run(shouldDebug, { showOnlyResultSummary })
                .then((result: IPyTestResult) => {
                    parentPort?.postMessage(result);
                });
        });
    }
}