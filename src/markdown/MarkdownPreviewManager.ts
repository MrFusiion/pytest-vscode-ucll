import { Uri, ExtensionContext } from "vscode"
import { MarkdownEngine } from "./MarkdownEngine";
import { MarkdownPreviewPanel, IMarkdownPreviewPanelOptions } from "./MarkdownPreviewPanel";
import { MarkdownContentProvider } from "./MarkdownContentProvider";
import { MarkdownContributionProvider } from "./MarkdownContributionProvider";
import { Disposable } from "../util/Disposable";

export class MarkdownPreviewManager extends Disposable {

    private _markdownEngine: MarkdownEngine = new MarkdownEngine();
    private _panels: MarkdownPreviewPanel[] = [];

    private _contentProvider: MarkdownContentProvider;
    private _markdownContributions: MarkdownContributionProvider;

    constructor(context: ExtensionContext) {
        super();

        this._markdownContributions = new MarkdownContributionProvider(context.extensionPath);
        this._contentProvider = new MarkdownContentProvider(context, this._markdownEngine, this._markdownContributions);
    }

    public createMarkdownPanel(resource: Uri, options?: IMarkdownPreviewPanelOptions) {
        const panel = this.registerMarkdownPanel(new MarkdownPreviewPanel(
            resource,
            this._contentProvider,
            this._markdownContributions,
            options
        ));

        panel.render();

        return panel;
    }

    public getMarkdownPanel(resource: Uri, options?: IMarkdownPreviewPanelOptions): MarkdownPreviewPanel {
        const panel = this.getExistingMarkdownPanel(resource);
        if (panel) {
            // if (!panel.isVisible) {
            //     panel.show();
            // }
            return panel;
        }
        return this._register(this.createMarkdownPanel(resource, options));
    }

    public getExistingMarkdownPanel(resource: Uri): MarkdownPreviewPanel | undefined {
        return this._panels.find(panel => panel.resource.toString() === resource.toString());
    }

    private registerMarkdownPanel(panel: MarkdownPreviewPanel): MarkdownPreviewPanel {
        this._panels.push(panel);

        this._register(panel.ondidDispose(() => {
			const existing = this._panels.indexOf(panel);
			if (existing === -1) {
				return;
			}
			this._panels.splice(existing, 1);
		}));

        this._register(panel);

        return panel;
    }
}