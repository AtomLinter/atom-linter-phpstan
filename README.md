atom-linter-phpstan
=========================

This linter plugin for [Linter](https://github.com/AtomLinter/Linter) provides
an interface to [PHPStan](https://github.com/phpstan/phpstan). It will be
used with files that have the "PHP" syntax or PHP embedded within HTML.

## Installation
### PHPStan installation
Before installing this plugin, you must ensure that `phpstan` is installed on your
system. For detailed instructions see [PHPStan Github](https://github.com/phpstan/phpstan),
the simplified steps are:

0. Install [php](http://php.net).
0. Install [Composer](https://getcomposer.org/download/).
0. Install `phpstan` by typing the following in a terminal:
```ShellSession
composer global require phpstan/phpstan
```

After verifying that `phpstan` works from your terminal, proceed to install the atom-linter-phpstan plugin.

### Plugin installation
```ShellSession
$ apm install apm-linter-phpstan
```
