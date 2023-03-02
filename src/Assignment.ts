import { commands, Uri, ViewColumn, window, workspace } from "vscode";
import * as path from "path";
import { WritableStreamDefaultController } from "stream/web";

export class Assignment {

    private file: string;

    public constructor(folder: string) {
        this.file = path.join(folder, "assignment.md");
    }

    public async open() {
        await commands.executeCommand("markdown.showPreviewToSide", Uri.file(this.file))
    }

}