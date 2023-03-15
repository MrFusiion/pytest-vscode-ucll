import { ExtensionContext, RelativePattern, workspace, Uri } from "vscode";
import * as path from "path";
import { Disposable } from "./util/Disposable";
import { MarkdownPreviewManager } from "./markdown/MarkdownPreviewManager";
import { IMarkdownPreviewPanelOptions, MarkdownPreviewPanel } from "./markdown/MarkdownPreviewPanel";
import { file } from "tmp";

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

        const assignment = await AssignmentManager.getAssignment(folder);
        if (!assignment) {
            return null;
        }

        return this.openMd(assignment, options);
    }

    public openMd(file: Uri, options?: IMarkdownPreviewPanelOptions): MarkdownPreviewPanel|null {
        return this._markdownPreviewManager.getMarkdownPanel(file, {
            name: `Assignment: ${path.basename(path.dirname(file.fsPath))}`,
            iconPath: Uri.file(path.join(this._context.extensionPath, "images", "logo.png")),
            ...options
        });
    }

    public static async getAssignment(folder: string): Promise<Uri|null> {
        for (const name of ASSIGMENT_NAMES) {
            if (name === "*.md") {
                continue; // don't use the fallback
            }
            const pattern = new RelativePattern(folder, name);
            const files = await workspace.findFiles(pattern);
            if (files.length > 0) {
                return files[0];
            }
        }
        return null;
    }
}