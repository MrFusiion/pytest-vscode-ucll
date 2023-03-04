import { Disposable as VsCodeDisposable } from "vscode";

export function disposeAll(disposables: VsCodeDisposable[]) {
	while (disposables.length) {
		const item = disposables.pop();
		if (item) {
			item.dispose();
		}
	}
}

export abstract class Disposable implements Disposable {

    private _isDisposed: boolean = false;

    protected _disposables: VsCodeDisposable[] = [];

    public dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        disposeAll(this._disposables);
    }

    protected _register<T extends VsCodeDisposable>(value: T): T {
        if (this._isDisposed) {
            value.dispose();
        } else {
            this._disposables.push(value);
        }
        return value;
    }

    protected get isDisposed() {
        return this._isDisposed;
    }

}