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
        require('atom-package-deps').install('linter-phpstan');
      }
      loadDeps();
    };
    depsCallbackID = window.requestIdleCallback(installLinterDeps);
    this.idleCallbacks.add(depsCallbackID);

    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe('linter-phpstan.executablePath', (value) => {
        this.executablePath = value;
      }),
      atom.config.observe('linter-phpstan.autoExecutableSearch', (value) => {
        this.autoExecutableSearch = value;
      }),
      atom.config.observe('linter-phpstan.disableWhenNoConfigFile', (value) => {
        this.disableWhenNoConfigFile = value;
      }),
      atom.config.observe('linter-phpstan.configFile', (value) => {
        this.configFile = value;
      }),
      atom.config.observe('linter-phpstan.autoConfigSearch', (value) => {
        this.autoConfigSearch = value;
      }),
      atom.config.observe('linter-phpstan.level', (value) => {
        this.level = value;
      }),
      atom.config.observe('linter-phpstan.autoloadFile', (value) => {
        this.autoloadFile = value;
      }),
      atom.config.observe('linter-phpstan.autoAutoloadSearch', (value) => {
        this.autoAutoloadSearch = value;
      }),
      atom.config.observe('linter-phpstan.memoryLimit', (value) => {
        this.memoryLimit = value;
      })
    );
  },

  deactivate() {
    this.idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
    this.idleCallbacks.clear();
    this.subscriptions.dispose();
  },

  provideLinter() {
    const linter = {
      name: 'PHPStan',
      scope: 'file',
      lintsOnChange: false,
      grammarScopes: ['text.html.php', 'source.php'],
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
        // Check if a local PHPMD executable is available
        if (this.autoExecutableSearch === true) {
          const phpmdNames = ['vendor/bin/phpstan'];
          const projExecutable = await helpers.findCachedAsync(fileDir, phpmdNames);

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

        if (levels.indexOf(this.level) != -1) {
          parameters.push('-l', this.level);
        }

        if (autoloadFile) {
          parameters.push('-a', autoloadFile);
        }

        if (this.memoryLimit) {
          parameters.push('--memory-limit', this.memoryLimit);
        }

        if (confFile) {
          parameters.push('-c', confFile);
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
          ignoreExitCode: true,
          timeout: 1000 * 60 * 5, // ms * s * m: 5 minutes
        };

        // Execute PHPMD
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

    return linter;
  }
};
