import { ExtensionContext, RelativePattern, workspace, Uri } from "vscode";
import * as path from "path";
import { Disposable } from "./util/Disposable";
import { MarkdownPreviewManager } from "./markdown/MarkdownPreviewManager";
import { IMarkdownPreviewPanelOptions, MarkdownPreviewPanel } from "./markdown/MarkdownPreviewPanel";

const ASSIGMENT_NAMES = [
    "assignment.md",
    "explanation.md",
    "*.md" // fallback for when the assignment is not named correctly
]

export class AssignmentManager extends Disposable {

    private _markdownPreviewManager: MarkdownPreviewManager;
    private _context: ExtensionContext;

    constructor(context: ExtensionContext) {
        super();
        this._context = context;
        this._markdownPreviewManager = this._register(new MarkdownPreviewManager(context));
    }

    public async open(folder: string, options?: IMarkdownPreviewPanelOptions): Promise<MarkdownPreviewPanel|null> {
        for (const name of ASSIGMENT_NAMES) {
            const pattern = new RelativePattern(folder, name);
            const files = await workspace.findFiles(pattern);
            if (files.length > 0) {
                return this._markdownPreviewManager.getMarkdownPanel(files[0], {
                    name: `Assignment: ${path.basename(folder)}`,
                    iconPath: Uri.file(path.join(this._context.extensionPath, "images", "logo.png")),
                    ...options
                });
            }
        }
        return null;
    }
}