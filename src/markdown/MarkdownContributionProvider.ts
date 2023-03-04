import { EventEmitter, Extension, ExtensionContext, Uri, extensions } from "vscode";
import { Disposable } from "../util/Disposable";
import * as arrays from "../util/Arrays";
import * as path from "path";

export interface MarkdownContributions {
	readonly previewScripts: ReadonlyArray<Uri>;
	readonly previewStyles: ReadonlyArray<Uri>;
	readonly previewResourceRoots: ReadonlyArray<Uri>;
	readonly markdownItPlugins: Map<string, Thenable<(md: any) => any>>;
}

export namespace MarkdownContributions {

    export const Empty: MarkdownContributions = {
		previewScripts: [],
		previewStyles: [],
		previewResourceRoots: [],
		markdownItPlugins: new Map()
	};

    export function merge(a: MarkdownContributions, b: MarkdownContributions): MarkdownContributions {
        return {
            previewScripts: [...a.previewScripts, ...b.previewScripts],
            previewStyles: [...a.previewStyles, ...b.previewStyles],
            previewResourceRoots: [...a.previewResourceRoots, ...b.previewResourceRoots],
            markdownItPlugins: new Map([...a.markdownItPlugins, ...b.markdownItPlugins])
        };
    }

    function uriEqual(a: Uri, b: Uri): boolean {
		return a.toString() === b.toString();
	}

    export function equal(a: MarkdownContributions, b: MarkdownContributions): boolean {
		return arrays.equals(a.previewScripts, b.previewScripts, uriEqual)
			&& arrays.equals(a.previewStyles, b.previewStyles, uriEqual)
			&& arrays.equals(a.previewResourceRoots, b.previewResourceRoots, uriEqual)
			&& arrays.equals(Array.from(a.markdownItPlugins.keys()), Array.from(b.markdownItPlugins.keys()));
	}

    export function fromExtension(extension: any): MarkdownContributions {
        const contributions = extension.packageJSON && extension.packageJSON.contributes;
        if (!contributions) {
            return MarkdownContributions.Empty;
        }

        const previewStyles = getContributedStyles(contributions, extension);
        const previewScripts = getContributedScripts(contributions, extension);
        const previewResourceRoots = previewStyles.length ? [Uri.file(extension.extensionPath)] : [];
        const markdownItPlugins = getContributedMarkdownItPlugins(contributions, extension);

        return {
            previewScripts,
            previewStyles,
            previewResourceRoots,
            markdownItPlugins
        }
    }   

    function getContributedMarkdownItPlugins(
        contributes: any,
        extension: Extension<any>
    ): Map<string, Thenable<(md: any) => any>> {
        const map =  new Map<string, Thenable<(md: any) => any>>();
        if (contributes["markdown.markdownItPlugins"]) {
            map.set(extension.id, extension.activate().then(() => {
                if (extension.exports && extension.exports.extendMarkdownIt) {
                    return (md: any) => extension.exports.extendMarkdownIt(md);
                }
                return (md: any) => md;
            }));
        }
        return map;
    }

    function getContributedStyles(
        contributes: any,
        extension: Extension<any>
    ): Uri[] {
        return resolveExtensionResources(extension, contributes["markdown.previewStyles"]) || [];
    }

    function getContributedScripts(
        contributes: any,
        extension: Extension<any>
    ): Uri[] {
        return resolveExtensionResources(extension, contributes["markdown.previewScripts"]) || [];
    }

    function resolveExtensionResource(extension: Extension<any>, resourcePath: string) {
        return Uri.file(path.join(extension.extensionPath, resourcePath));
    }

    function resolveExtensionResources(extension: Extension<any>, resourcePaths: string[]) {
        const result: Uri[] = [];
        if (Array.isArray(resourcePaths)) {
            for (const resource of resourcePaths) {
                try {
                    result.push(resolveExtensionResource(extension, resource));
                } catch (e) {
                    // noop
                }
            }
        }
        return result;
    }

}

export class MarkdownContributionProvider extends Disposable {

    private _contributions?: MarkdownContributions;
    private readonly _onContributionsChanged = this._register(new EventEmitter<this>());

    public readonly onContributionsChanged = this._onContributionsChanged.event;

    constructor(
        public readonly extensionPath: string,
    ) {
        super();

        extensions.onDidChange(() => {
            const currentContributions = this.getCurrentContributions();
            const existingContributions = this._contributions || MarkdownContributions.Empty;
            if (!MarkdownContributions.equal(currentContributions, existingContributions)) {
                this._contributions = currentContributions;
                this._onContributionsChanged.fire(this);
            }
        }, undefined, this._disposables);
    }

    public get contributions(): MarkdownContributions {
        if (!this._contributions) {
            this._contributions = this.getCurrentContributions();
        }
        return this._contributions;
    }

    private getCurrentContributions(): MarkdownContributions {
        return extensions.all
            .map(MarkdownContributions.fromExtension)
            .reduce(MarkdownContributions.merge, MarkdownContributions.Empty);
    }
}

export function getMarkdownExtensionContributions(context: ExtensionContext): MarkdownContributionProvider {
	return new MarkdownContributionProvider(context.extensionPath);
}