import * as MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { Uri, workspace } from 'vscode';


export class MarkdownEngine {

    private md?: MarkdownIt;

    constructor() {}

    public getEngine(): MarkdownIt {
        if (!this.md) {
            this.md = MarkdownIt(this.getConfig());
        }
        return this.md;
    }

    private getConfig(): MarkdownIt.Options {
        return {
            html: true,
            highlight: function(str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        const highlighted = hljs.highlight(str, {
                            language: lang,
                            ignoreIllegals: true,
                        }).value;
                        return `<div>${highlighted}</div>`;
                    } catch (__) {
                        console.log("Error highlighting code block!")
                    }
                }
                return `<code><div> ${MarkdownIt().utils.escapeHtml(str)}</code></div>`; // use external default escaping
            }
        };
    }

    public async render(resource: Uri): Promise<string> {
        const bytes = await workspace.fs.readFile(resource);
        return this.getEngine().render(bytes.toString());
    }
}