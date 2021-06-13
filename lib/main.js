'use babel';

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
import {
    CompositeDisposable
} from 'atom';

let helpers;
let path;

function loadDeps() {
    if (!helpers) {
        helpers = require('atom-linter');
    }
    if (!path) {
        path = require('path');
    }
}

export default {
    activate(state) {
        this.idleCallbacks = new Set();
        let depsCallbackID;
        const installLinterDeps = () => {
            this.idleCallbacks.delete(depsCallbackID);
            if (!atom.inSpecMode()) {
                require('atom-package-deps').install('atom-linter-phpstan');
            }
            loadDeps();
        };
        depsCallbackID = window.requestIdleCallback(installLinterDeps);
        this.idleCallbacks.add(depsCallbackID);

        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(
            atom.config.observe('atom-linter-phpstan.executablePath', (value) => {
                this.executablePath = value;
            }),
            atom.config.observe('atom-linter-phpstan.autoExecutableSearch', (value) => {
                this.autoExecutableSearch = value;
            }),
            atom.config.observe('atom-linter-phpstan.disableWhenNoConfigFile', (value) => {
                this.disableWhenNoConfigFile = value;
            }),
            atom.config.observe('atom-linter-phpstan.configFile', (value) => {
                this.configFile = value;
            }),
            atom.config.observe('atom-linter-phpstan.autoConfigSearch', (value) => {
                this.autoConfigSearch = value;
            }),
            atom.config.observe('atom-linter-phpstan.level', (value) => {
                this.level = value;
            }),
            atom.config.observe('atom-linter-phpstan.overrideConfigLevel', (value) => {
                this.willLinterLevelOverrideConfig = value;
            }),
            atom.config.observe('atom-linter-phpstan.autoloadFile', (value) => {
                this.autoloadFile = value;
            }),
            atom.config.observe('atom-linter-phpstan.autoAutoloadSearch', (value) => {
                this.autoAutoloadSearch = value;
            }),
            atom.config.observe('atom-linter-phpstan.memoryLimit', (value) => {
                this.memoryLimit = value;
            }),
            atom.config.observe('atom-linter-phpstan.enableDebugMode', (value) => {
                this.isDebugModeEnabled = value;
            })
        );
    },

    deactivate() {
        this.idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
        this.idleCallbacks.clear();
        this.subscriptions.dispose();
    },

    provideLinter() {
        return {
            name: 'PHPStan',
            grammarScopes: ['text.html.php', 'source.php'],
            scope: 'file',
            lintsOnChange: false,
            lint: async (textEditor) => {
                const filePath = textEditor.getPath();
                const fileText = textEditor.getText();

                if (fileText === '' || !filePath) {
                    // Empty file, empty results
                    return [];
                }

                loadDeps();
                const fileDir = path.dirname(filePath);

                let executable = this.executablePath;
                // Check if a local PHPStan executable is available
                if (this.autoExecutableSearch === true) {
                    const phpstanNames = ['vendor/bin/phpstan'];
                    const projExecutable = await helpers.findCachedAsync(fileDir, phpstanNames);

                    if (projExecutable !== null) {
                        executable = projExecutable;
                    }
                }

                let confFile = this.configFile;

                // Check if a config file exists and handle it
                if (this.autoConfigSearch === true) {
                    confFile = await helpers.findAsync(fileDir, ['phpstan.neon', 'phpstan.neon.dist']);

                    // Check if we should stop linting when no config file could be found
                    if (this.disableWhenNoConfigFile && !confFile) {
                        return [];
                    }
                }

                let autoloadFile = this.autoloadFile;

                // Check if a config file exists and handle it
                if (this.autoAutoloadSearch === true) {
                    autoloadFile = await helpers.findAsync(fileDir, ['vendor/autoload.php']);
                }

                // PHPStan cli parameters
                const parameters = [
                    'analyze',
                    '--error-format',
                    'raw',
                    '--no-progress',
                    filePath
                ];

                // PHPStan levels
                const levels = [
                    '0', '1', '2', '3', '4', '5', '6', '7', 'max'
                ];

                if (autoloadFile) {
                    parameters.push('-a', autoloadFile);
                }

                if (this.memoryLimit) {
                    parameters.push('--memory-limit=' + this.memoryLimit);
                }

                if (confFile) {
                    parameters.push('-c', confFile);
                }

                if (
                    levels.indexOf(this.level) !== -1 && !confFile ||
                    levels.indexOf(this.level) !== -1 && confFile && this.willLinterLevelOverrideConfig
                ) {
                    parameters.push('-l', this.level);
                }

                // Current working dir
                let workDir = fileDir;

                // Determine project path
                const projectPath = atom.project.relativizePath(filePath)[0];

                // Set current working dir based on config path or project path
                if (confFile) {
                    workDir = path.dirname(confFile);
                } else if (projectPath) {
                    workDir = projectPath;
                }

                // PHPStan exec options
                const execOptions = {
                    cwd: workDir,
                    timeout: 1000 * 60 * 2, // ms * s * m: 5 minutes
                    throwOnStderr: !this.isDebugModeEnabled,
                    ignoreExitCode: true
                };

                // Execute PHPStan
                const result = await helpers.exec(executable, parameters, execOptions);
                if (result === null) {
                    // Our specific spawn was terminated by a newer call, tell Linter not
                    // to update messages
                    return null;
                }

                // Check if the file contents have changed since the lint was triggered
                if (textEditor.getText() !== fileText) {
                    // Contents have changed, tell Linter not to update results
                    return null;
                }

                // Message regex
                const regex = /(.+):(\d+):\t*(.+)/g;

                const messages = [];
                let match = regex.exec(result);
                while (match !== null) {
                    const line = Number.parseInt(match[2], 10) - 1;
                    messages.push({
                        severity: 'error',
                        location: {
                          file: match[1],
                          position: helpers.generateRange(textEditor, line),
                        },
                        excerpt: match[3],
                    });

                    match = regex.exec(result);
                }

                return messages;
            }
        };
    }
};
