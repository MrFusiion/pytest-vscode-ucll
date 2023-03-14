import { Location, Position, Uri, TestMessage } from "vscode";
import { IPyTestXmlResultTestCase, IPyTestXmlResultTestCaseMessage } from "./PyTestXmlResultParser";

const ERROR_REGEX = /[\w]+\.py:(\d+): (\w+)/;
const ASSERT_ERROR = /assert (.+) == (.+)/;
const ASCII_ESCAPE_REGEX = /#x1B\[\d+(?:;\d+)?m/g;
const NEWLINE_REGEX = /&#10/g;

export interface ErrorObject {
    readonly kind: string;
    readonly message: string;
}

export class PyTestResultError {

    public readonly error: ErrorObject;
    public readonly line: number;

    constructor(resultMessage: IPyTestXmlResultTestCaseMessage) {
        const text = this.parseText(resultMessage["#text"] || "");
        // const text = resultMessage["#text"] || "";
        const [_, line, kind] = ERROR_REGEX.exec(text) ?? [];

        this.error = {
            kind: kind || "",
            message: this.parseText(resultMessage.message || "")
        };

        this.line = parseInt(line || "-1", 10);
    }

    static fromTestCase(testcase: IPyTestXmlResultTestCase): PyTestResultError | undefined {
        const resultMessage = testcase.error || testcase.failure || testcase.skipped;
        return resultMessage && new PyTestResultError(resultMessage);
    }

    private parseText(text: string): string {
        return text
            .replace(ASCII_ESCAPE_REGEX, "")
            .replace(NEWLINE_REGEX, "\n");
    }

    public getLocation(uri: Uri): Location {
        return new Location(uri, new Position(this.line, 0));
    }

    public getTestMessage(uri: Uri): TestMessage {
        switch (this.error.kind) {
            case "AssertionError":
                const [_, expected, actual] = ASSERT_ERROR.exec(this.error.message) ?? [];
                const msg = new TestMessage(this.error.message);
                msg.location = this.getLocation(uri);
                msg.expectedOutput = expected;
                msg.actualOutput = actual;
                return msg;
            default:
                return new TestMessage(this.error.message);
        }
    }
}