import { window } from "vscode";

export default class Window {

    static showErrorMessage(e: any): string {
        let message = "";
        if (e instanceof Error) {
            message = e.message;
        } else if (typeof e === "string") {
            message = e;
        } else {
            message = `An error occurred while running tests: ${String(e)}`;
        }
        window.showErrorMessage(message);
        return message;
    }

}