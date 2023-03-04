import {
	ExtensionContext,
	window,
} from 'vscode';
import * as path from "path";
import { TestProvider } from './TestProvider';
import { AssignmentManager } from './AssignmentManager';

export function activate(context: ExtensionContext) {

	console.log("Activated pytest-vscode-ucll extension!");

	const assignmentManager = new AssignmentManager(context);

	window.onDidChangeActiveTextEditor(editor => {
		const document = editor?.document;
		if (!document) {
			return;
		}

		const fileName = document.fileName;
		if (fileName.endsWith("student.py")) {
			assignmentManager.open(path.dirname(fileName));
		}
	});

	const testProvider = new TestProvider();

	context.subscriptions.push(testProvider);
	context.subscriptions.push(assignmentManager);
}
