import {
	ExtensionContext,
	window,
	workspace
} from 'vscode';
import * as path from "path";
import { TestProvider } from './TestProvider';
import { openAssignment } from './openAssignment';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	console.log("Activated pytest-vscode-ucll extension!");

	workspace.onDidOpenTextDocument(textDocument => {
		const fileName = textDocument?.fileName;
		if (fileName?.endsWith("student.py")) {
			openAssignment(path.dirname(fileName));
		}
	});

	const testProvider = new TestProvider();

	context.subscriptions.push(testProvider);
}
