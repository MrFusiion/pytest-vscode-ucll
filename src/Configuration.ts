import { ConfigurationChangeEvent, workspace, WorkspaceConfiguration } from "vscode";

export class Configuration {

    public static getValue<T=unknown>(key: string): T | undefined {
        return workspace.getConfiguration().get<T>(key);
    }

    public static onDidChangeConfiguration(listener: (e: ConfigurationChangeEvent) => any) {
        return workspace.onDidChangeConfiguration(listener);
    }

}