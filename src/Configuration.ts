import { workspace, WorkspaceConfiguration } from "vscode";

export class Configuration {

    public static getValue<T=unknown>(key: string): T | undefined {
        return workspace.getConfiguration().get<T>(key);
    }

}