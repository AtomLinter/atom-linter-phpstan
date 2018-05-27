'use babel';

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
import { CompositeDisposable } from 'atom';

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
        console.log('PHPStan: Activate');
        this.idleCallbacks = new Set();
        let depsCallbackID;
        const installLinterDeps = () => {
            console.log('PHPStan: Load dependencies');
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
            atom.config.observe('atom-linter-phpstan.level', (value) => {
                this.level = value;
            })
        );
    },

    deactivate() {
        console.log('PHPStan: Deactivate');
        this.idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
        this.idleCallbacks.clear();
        this.subscriptions.dispose();
    },

    provideLinter() {
        console.log('PHPStan: Provide Linter');
        return {
            name: 'PHPStan',
            grammarScopes: ['text.html.php', 'source.php'],
            scope: 'file',
            lintOnFly: false,
            lint: async (textEditor) => {
                console.log('PHPStan: Linting');
                const filePath = textEditor.getPath();
                const fileText = textEditor.getText();

                if (fileText === '' || !filePath) {
                    console.log('PHPStan: Empty file');
                    // Empty file, empty results
                    return [];
                }

                loadDeps();
                const fileDir = path.dirname(filePath);

                let executable = this.executablePath;
                console.log('PHPStan: Executable "' + executable + '"');
                // Check if a local PHPMD executable is available
                if (this.autoExecutableSearch === true) {
                    const phpmdNames = ['vendor/bin/phpstan'];
                    const projExecutable = await helpers.findCachedAsync(fileDir, phpmdNames);

                    if (projExecutable !== null) {
                        executable = projExecutable;
                    }
                }

                console.log('PHPStan: Executable "' + executable + '"');

                // PHPStan cli parameters
                const parameters = [
                    'analyze',
                    '--errorFormat',
                    'raw',
                    '--no-progress',
                    filePath
                ];

                const levels = [
                    0,1,2,3,4,5,6,7,'max'
                ];

                // Rule priority threshold; rules with lower priority than this will not be used
                if (levels.indexOf(this.level) != -1) {
                    parameters.push('-l', this.level);
                }

                console.log(parameters);

                // Current working dir
                let workDir = fileDir;

                // Determine project path
                const projectPath = atom.project.relativizePath(filePath)[0];

                console.log('PHPStan: ProjectPath "' + projectPath + '"');

                // Set current working dir based on project path
                if (projectPath) {
                    workDir = projectPath;
                }

                // PHPStan exec options
                const execOptions = {
                    cwd: workDir,
                    ignoreExitCode: true,
                    timeout: 1000 * 60 * 5, // ms * s * m: 5 minutes
                };
                console.log(execOptions);
                // Execute PHPMD
                const result = await helpers.exec(executable, parameters, execOptions);
                console.log('PHPStan: ' + result);
                if (result === null) {
                    // Our specific spawn was terminated by a newer call, tell Linter not
                    // to update messages
                    return null;
                }

                // Check if the file contents have changed since the lint was triggered
                if (textEditor.getText() !== fileText) {
                    console.log('PHPStan: Contents have changed');
                    // Contents have changed, tell Linter not to update results
                    return null;
                }

                // Message regex
                const regex = /(.+):(\d+):\t*(.+)/g;

                const messages = [];
                let match = regex.exec(result);
                console.log(match);
                while (match !== null) {
                    const line = Number.parseInt(match[2], 10) - 1;
                    messages.push({
                        type: 'Error',
                        filePath: match[1],
                        range: helpers.generateRange(textEditor, line),
                        text: match[3],
                    });

                    match = regex.exec(result);
                }

                return messages;
            }
        };
    }
};
