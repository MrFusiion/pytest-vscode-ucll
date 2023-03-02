import { commands, Uri, workspace } from "vscode";
import * as path from "path";

export async function openAssignment(folder: string) {
    const file = path.join(folder, "assignment.md")
    await commands.executeCommand("markdown.showPreviewToSide", Uri.file(file));
}