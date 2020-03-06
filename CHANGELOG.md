# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Fix for #9: Best fix we'll get without massive changes.

## [v2.1.1] - 2019-12-08
### Fixed
- Fix #11: Memory limit of -1 causing errors in cli arguments

## [v2.1.0] - 2019-12-06
### Fixed
- Updated CHANGELOG.md to match current project state and releases.
- Updated main.js to remove all PHPMD references.
- Updated package.json to point to group repo.

## [v2.0.1] - 2019-06-30
### Fixed
- Still using parameter from Linter V1 with V2 API.

## [v2.0.0] - 2019-05-28
### New
- Group ownership for maintenance of this package.

### Fixed
- Update package name for new org based ownership.
- Incorrect PHPStan argument being used - was still using the deprecated flag.
- Updated to Linter API V2 from V1.

## v1.0.2
- #2: Fix for configuration file

## v1.0.1
- #1: Fix for Level parameter

## v1.0.0
- Initial release

[unreleased]: https://github.com/AtomLinter/atom-linter-phpstan/compare/v2.0.1...HEAD
[v2.0.1]: https://github.com/AtomLinter/atom-linter-phpstan/compare/v2.0.0...v2.0.1
[v2.0.0]: https://github.com/AtomLinter/atom-linter-phpstan/compare/v1.0.2...v2.0.0
