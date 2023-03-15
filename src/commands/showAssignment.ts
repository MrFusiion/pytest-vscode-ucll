import { Uri, window } from "vscode";
import * as path from "path";
import { AssignmentManager } from "../AssignmentManager";

export function createShowAssignmentHandler(assigmentManager: AssignmentManager) {

    return async function(file?: Uri) {
        file = file || window.activeTextEditor?.document?.uri;
        const dirname = file ? path.dirname(file.fsPath) : undefined;

        if (!dirname) {
            return;
        }

        const assignment = await AssignmentManager.getAssignment(dirname);
        if (assignment) {
            assigmentManager.openMd(assignment);
        }
    }
}