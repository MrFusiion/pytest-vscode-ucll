import {
	ExtensionContext
} from 'vscode';

import { TestProvider } from './TestProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	console.log("Activated pytest-vscode-ucll extension!");

	const testProvider = new TestProvider();

	context.subscriptions.push(testProvider);
}
