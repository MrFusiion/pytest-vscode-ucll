import { ExtensionContext, Uri, Webview } from "vscode";
import { MarkdownEngine } from "./MarkdownEngine";
import { MarkdownContributionProvider } from "./MarkdownContributionProvider";


function escapeAttribute(value: string | Uri): string {
	return value.toString().replace(/"/g, '&quot;');
}

export class MarkdownContentProvider {

    private readonly _context: ExtensionContext
    private readonly _engine: MarkdownEngine
    private readonly _contributionProvider: MarkdownContributionProvider

    constructor(context: ExtensionContext, engine: MarkdownEngine, contributionProvider: MarkdownContributionProvider) {
        this._context = context;
        this._engine = engine;
        this._contributionProvider = contributionProvider;
    }

    public async render(webview: Webview, resource: Uri) {

        const nonce = new Date().getTime() + '' + new Date().getMilliseconds();

        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            ${this.getStyles(webview)}
        </head>
        <body>
            ${await this._engine.render(resource)}
            ${this.getScripts(webview, nonce)}
        </body>`
    }

    private getStyles(webview: Webview) {
        const baseStyles = [];
        for (const style of this._contributionProvider.contributions.previewStyles) {
            baseStyles.push(`<link rel="stylesheet" type="text/css" href="${escapeAttribute(webview.asWebviewUri(style))}">`);
        }
        return baseStyles.join("\n");
    }

    private getScripts(webview: Webview, nonce: string) {
        const baseScripts = [];
        for (const script of this._contributionProvider.contributions.previewScripts) {
            baseScripts.push(`<script async
                src="${escapeAttribute(webview.asWebviewUri(script))}"
                nonce="${nonce}"
                charset="UTF-8"></script>`
            );
        }
        return baseScripts.join("\n");
    }

}