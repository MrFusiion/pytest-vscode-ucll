import { WebviewPanel, Uri, ViewColumn, Disposable as VsCodeDisposable, window } from "vscode";
import { Disposable } from "../util/Disposable";
import { MarkdownContentProvider } from "./MarkdownContentProvider";
import { MarkdownContributionProvider } from "./MarkdownContributionProvider";
import * as path from "path";

export interface IMarkdownPreviewPanelOptions {
    readonly name?: string;
    readonly viewColumn?: ViewColumn;
    readonly preserveFocus?: boolean;
    readonly iconPath?: Uri | { light: Uri; dark: Uri };
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
            options.name || `Markdown Preview ${resource.fsPath}`,
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
        
        this.panel.iconPath = options.iconPath;
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

    public show() {
        this.panel.reveal();
    }

    public get viewColumn(): ViewColumn | undefined {
        return this.panel.viewColumn;
    }

    public get isVisible() {
        return this.panel.visible;
    }
}