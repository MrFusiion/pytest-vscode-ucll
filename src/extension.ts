import {
	ExtensionContext,
	window
} from 'vscode';
import * as path from "path";
import { TestProvider } from './TestProvider';
import { Assignment } from './Assignment';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	console.log("Activated pytest-vscode-ucll extension!");

	window.onDidChangeActiveTextEditor(editor => {
		const fileName = editor?.document?.fileName;
		if (fileName?.endsWith("student.py")) {
			const assignment = new Assignment(path.dirname(fileName));
			assignment.open();
		}
	});

	const testProvider = new TestProvider();

	context.subscriptions.push(testProvider);
}
