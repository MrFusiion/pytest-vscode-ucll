import { commands, Uri } from "vscode";
import * as path from "path";

export class Assignment {

    private file: string;

    public constructor(folder: string) {
        this.file = path.join(folder, "assignment.md");
    }

    public async open() {
        await commands.executeCommand("markdown.showPreviewToSide", Uri.file(this.file))
    }

}