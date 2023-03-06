import {
	ExtensionContext,
	window,
} from 'vscode';
import * as path from "path";
import { TestProvider } from './testing/TestProvider';
import { AssignmentManager } from './AssignmentManager';
import { Configuration } from './Configuration';

export function activate(context: ExtensionContext) {

	console.log("Activated pytest-vscode-ucll extension!");

	const assignmentManager = new AssignmentManager(context);

	window.onDidChangeActiveTextEditor(async editor => {
		const document = editor?.document;
		if (!document) {
			return;
		}

		const fileName = document.fileName;
		if (fileName.endsWith("student.py")) {
			if (!Configuration.getValue<boolean>("vscode.pytest.ucll.autoOpenAssignments")) {
				return;
			}
			const assignment = await assignmentManager.open(path.dirname(fileName));
			if (assignment && assignment.viewColumn != editor.viewColumn) {
				assignment.show();
			}
		}
	});

	const testProvider = new TestProvider(context);

	context.subscriptions.push(testProvider);
	context.subscriptions.push(assignmentManager);
}
