import { disposeAll, Disposable } from "./Disposable";
import { Disposable as VScodeDisposable } from "vscode";

export default class Janitor extends Disposable {

    private _onDispose: () => void;
    
    constructor(onDispose: () => void=()=>{}) {
        super();
        this._disposables = [];
        this._onDispose = onDispose;
    }

    public register<T extends VScodeDisposable>(value: T): T {
        return this._register(value);
    }

    public disposeItems() {
        this._onDispose();
        disposeAll(this._disposables);
        this._disposables = [];
    }

    public dispose() {
        this.disposeItems();
    }
}