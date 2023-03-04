import { WebviewPanel, Uri, ViewColumn, Disposable as VsCodeDisposable, window } from "vscode";
import { Disposable } from "../util/Disposable";
import { MarkdownContentProvider } from "./MarkdownContentProvider";
import { MarkdownContributionProvider } from "./MarkdownContributionProvider";
import * as path from "path";

export interface IMarkdownPreviewPanelOptions {
    readonly viewColumn?: ViewColumn;
    readonly preserveFocus?: boolean;
}

export class MarkdownPreviewPanel extends Disposable {

    public readonly panel: WebviewPanel;

    constructor(
        public readonly resource: Uri,
        private contentProvider: MarkdownContentProvider,
        contrubtionProvider: MarkdownContributionProvider,
        options: IMarkdownPreviewPanelOptions={}
    ) {
        super();
        this.panel = this._register(window.createWebviewPanel(
            `markdown-preview-${resource}`,
            `Markdown Preview ${path.dirname(resource.fsPath)}`,
            {
                viewColumn: options.viewColumn || ViewColumn.Two,
                preserveFocus: options.preserveFocus !== undefined
                    ? options.preserveFocus : true,
            },
            {
                enableScripts: true,
                localResourceRoots: contrubtionProvider.contributions.previewResourceRoots,
            }
        ));
    }

    public async render() {
        this.panel.webview.html = await this.contentProvider.render(
            this.panel.webview,
            this.resource
        );
    }

    public ondidDispose(listener: (e: void) => void): VsCodeDisposable {
        return this.panel.onDidDispose(listener);
    }

    public dispose() {
        super.dispose();
    }

    public show() {
        this.panel.reveal();
    }

    public get isVisible() {
        return this.panel.visible;
    }
}