import { XMLParser, X2jOptionsOptional } from "fast-xml-parser";
import { Uri, workspace } from "vscode";
import { IShellResult } from "../util/Shell";
import { PyTestResultError } from "./PyTestResultError";

export interface IPyTestXmlResultTestCaseMessage {
    "#text": string;
    message: string;
}

export interface IPyTestXmlResultTestCase {
    classname: string;
    name: string;
    time: string;
    failure: IPyTestXmlResultTestCaseMessage;
    error: IPyTestXmlResultTestCaseMessage;
    skipped: IPyTestXmlResultTestCaseMessage;
}

export interface IPyTestXmlResultTestSuite {
    errors: string;
    failures: string;
    skipped: string;
    tests: string;
    time: string;
    testcase: IPyTestXmlResultTestCase | IPyTestXmlResultTestCase[];
}

export interface IPyTestXmlResult {
    "?xml": {
        version: string;
        encoding: string;
    }
    testsuites: {
        testsuite: IPyTestXmlResultTestSuite;
    }
}

export interface IPyTestResult {
    failed: number;
    skipped: number;
    passed: number;
    errored: number;
    tests: number;
    duration: number;
    message: string;
    errors: PyTestResultError[];
    didFail: boolean;
    didError: boolean;
    didPass: boolean;
}

export class PyTestXmlResultParser extends XMLParser {
    
    constructor(options: X2jOptionsOptional = {}) {
        super({
            ignoreAttributes: false,
            attributeNamePrefix: "",
            ...options
        });
    }

    private async readFile(fsPath: string): Promise<IPyTestXmlResult> {
        const bytes = await workspace.fs.readFile(Uri.file(fsPath));
        const xml = new TextDecoder("utf-8").decode(bytes);
        return this.parse(xml);
    }

    public async parseResult(fsPath: string, result: IShellResult): Promise<IPyTestResult> {
        const xmlResult = await this.readFile(fsPath);
        const testsuite = xmlResult.testsuites.testsuite;
        const testcases = Array.isArray(testsuite.testcase) ? testsuite.testcase : [testsuite.testcase];
        
        const failed = parseInt(testsuite.failures);
        const skipped = parseInt(testsuite.skipped);
        const errored = parseInt(testsuite.errors);
        const tests = parseInt(testsuite.tests);
        const passed = tests - failed - skipped - errored;
        const duration = parseFloat(testsuite.time);

        const errors = testcases
            .map((testcase) => PyTestResultError.fromTestCase(testcase))
            .filter((error) => error !== undefined) as PyTestResultError[];

        return {
            failed,
            skipped,
            passed,
            errored,
            tests,
            duration,
            message: result.stderr || result.stdout,
            errors,
            didFail: failed > 0 || skipped > 0,
            didError: errored > 0,
            didPass: passed > 0
        }
    }

    public static errored(message: string): IPyTestResult {
        return {
            failed: 0,
            skipped: 0,
            passed: 0,
            errored: 0,
            tests: 0,
            duration: 0,
            message,
            errors: [],
            didFail: false,
            didError: true,
            didPass: false
        }
    }
}