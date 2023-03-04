"use strict";

const path = require("path");
const webpack = require("webpack");

/** @type {import("webpack").Configuration} */
const config = {
    target: "webworker",

    entry: "./src/extension.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "extension.js",
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]"
    },
    devtool: "source-map",
    externals: {
        vscode: "commonjs vscode",
        child_process: "commonjs child_process",
    },
    resolve: {
        mainFields: ["browser", "module", "main"],

        extensions: [".ts", ".js"],
        fallback: {
            "path": require.resolve("path"),
            "util": require.resolve("util"),
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader"
                    }
                ]
            }
        ]
    }
};
module.exports = config;