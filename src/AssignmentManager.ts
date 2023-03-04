import { Uri, ExtensionContext } from "vscode";
import * as path from "path";
import { Disposable } from "./util/Disposable";
import { MarkdownPreviewManager } from "./markdown/MarkdownPreviewManager";
import { IMarkdownPreviewPanelOptions, MarkdownPreviewPanel } from "./markdown/MarkdownPreviewPanel";

export class AssignmentManager extends Disposable {

    private _markdownPreviewManager: MarkdownPreviewManager;

    constructor(context: ExtensionContext) {
        super();
        this._markdownPreviewManager = this._register(new MarkdownPreviewManager(context));
    }

    public async open(folder: string, options?: IMarkdownPreviewPanelOptions): Promise<MarkdownPreviewPanel> {
        return this._markdownPreviewManager.getMarkdownPanel(
            Uri.file(path.join(folder, "assignment.md")),
            {
                name: `Assignment: ${path.basename(folder)}`,
                ...options
            }
        );
    }
}