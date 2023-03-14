"use strict";

const path = require("path");
const webpack = require("webpack");



module.exports = (_, env) => {
    return {
        target: "webworker",
    
        entry: {
            extension: "./src/extension.ts",
            shell_thread: "./src/shell_thread.ts"
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, "dist"),
            libraryTarget: "commonjs2",
            devtoolModuleFilenameTemplate: "../[resource-path]"
        },
        devtool: "source-map",
        externals: {
            vscode: "commonjs vscode",
            child_process: "commonjs child_process",
            worker_threads: "commonjs worker_threads",
            os: "commonjs os",
            fs: "commonjs fs",
            crypto: "commonjs crypto",
            assert: "commonjs assert",
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
        },
        plugins: [
            new webpack.DefinePlugin({
                "DEBUG": env.mode === "development"
            })
        ]
    };
};