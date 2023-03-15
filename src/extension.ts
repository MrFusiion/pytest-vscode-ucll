import {
	ExtensionContext,
	window,
	commands,
	workspace
} from 'vscode';
import * as path from "path";
import { TestProvider } from './testing/TestProvider';
import { AssignmentManager } from './AssignmentManager';
import { Configuration } from './Configuration';

import { createShowAssignmentHandler } from './commands/showAssignment';

export function activate(context: ExtensionContext) {

	console.log("Activated pytest-vscode-ucll extension!");

	const assignmentManager = new AssignmentManager(context);

	const disposable = window.onDidChangeActiveTextEditor(async editor => {
		const document = editor?.document;
		if (!document) {
			return;
		}

		const fileName = document.fileName;
		const dirname = path.dirname(fileName);
		if (fileName.endsWith("student.py")) {
			if (Configuration.getValue<boolean>("vscode.pytest.ucll.autoOpenAssignments")) {
				const assignment = await assignmentManager.open(dirname);
				if (assignment && assignment.viewColumn != editor.viewColumn) {
					assignment.show();
				}
			}
		}
	});

	commands.executeCommand("setContext", "pytest-vscode-ucll.files", {
		"student.py": true,
		"tests.py": true,
		"assignment.md": true,
		"explanation.md": true,
	});

	context.subscriptions.push(commands.registerCommand("pytest-vscode-ucll.showAssignment", 
									createShowAssignmentHandler(assignmentManager)));

	const testProvider = new TestProvider(context);

	context.subscriptions.push(disposable);
	context.subscriptions.push(testProvider);
	context.subscriptions.push(assignmentManager);
}
