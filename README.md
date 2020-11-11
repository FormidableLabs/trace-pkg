trace-pkg 📦
============

[![npm version][npm_img]][npm_site]
[![Actions Status][actions_img]][actions_site]
[![Coverage Status][cov_img]][cov_site]

A dependency tracing packager for Node.js source files.

## Overview

`trace-pkg` is a packager for Node.js applications. It ingests entry point files, then uses the [trace-deps][] library to infer all other source files imported at runtime, and then creates a zip bundle suitable for use with AWS Lambda, Serverless, etc.

## Usage

```
Usage: trace-pkg [options]

Options:
  -c, --config       Path to configuration file              [string] [required]
      --concurrency  Parallel processes to use (default: 1)            [number]
  -d, --dry-run      Don't actually produce output bundle              [boolean]
  -r, --report       Generate extended report                          [boolean]
  -h, --help         Show help                                         [boolean]
  -v, --version      Show version number                               [boolean]
```

## Configuration

`trace-pkg` can be configured via a YAML, JavaScript, or JSON file with additional CLI options.

### Configuration options

Configuration options are generally global (`options.<OPTION_NAME>`) and/or per-package (`packages.<PKG_NAME>.<OPTION_NAME>`). When there is both a global _and_ per-package option, the global option is applied _first_ then the per-package option is added to it. For an array option, that means additional unique items are added in. For an object option, this means that for each key in the object additional unique items in the array value are added in.

#### Global options

- `options.cwd` (`String`): Current working directory from which to read input files as well as output zip bundles (default: `process.cwd()`).
- `options.concurrency` (`Number`): The number of independent package tasks (per function and service) to run off the main execution thread. If `1`, then run tasks serially in main thread. If `2+` run off main thread with `concurrency` number of workers. If `0`, then use "number of CPUs" value. (default: `1`).
    - Can be overridden from CLI with `--concurrency <NUMBER>`
- `options.ignores` (`Array<string>`): A set of package path prefixes up to a directory level (e.g., `react` or `mod/lib`) to skip tracing on. This is particularly useful when you are excluding a package like `aws-sdk` that is already provided for your lambda.
- `options.allowMissing` (`Object.<string, Array<string>>`): A way to allow certain packages to have potentially failing dependencies. Specify each object key as a package name and value as an array of dependencies that _might_ be missing on disk. If the sub-dependency is found, then it is included in the bundle (this part distinguishes this option from `ignores`). If not, it is skipped without error.
- `options.dynamic.resolutions` (`Object.<string, Array<string>>`):
  `// TODO: IMPLEMENT options.dynamic.resolutions`
- `options.dynamic.bail` (`Boolean`):
  `// TODO: IMPLEMENT options.dynamic.bail`
  `// TODO: --dry-run just reports`
- `options.collapsed.bail` (`Boolean`):
  `// TODO: IMPLEMENT options.collapsed.bail`
  `// TODO: --dry-run just reports`

#### Per-package options

- `packages.<PKG_NAME>.cwd` (`String`): Override global `cwd` option. (default: `option.cwd` value).
- `packages.<PKG_NAME>.output` (`String`): File path (absolute or relative to `cwd` option) for output bundle. (default: `[packages.<NAME>].zip`).
- `packages.<PKG_NAME>.include` (`Array<string>`): A list of glob patterns to include/exclude in the package per [fast-glob][] globbing rules. Matched files are **not** traced for further dependencies are suitable for any file type that should end up in the bundle. Use this option for files that won't automatically be traced into your bundle.
- `packages.<PKG_NAME>.trace` (`Array<string>`): A list of [fast-glob][] glob patterns to match JS files that will be further traced to infer all imported dependencies via static analysis. Use this option to include your source code files that comprises your application.
- `packages.<PKG_NAME>.ignores` (`Array<string>`): Additional configuration to merge with `options.ignores`.
- `packages.<PKG_NAME>.allowMissing` (`Object.<string, Array<string>>`): Additional configuration to merge with `options.allowMissing`.
- `packages.<PKG_NAME>.dynamic.resolutions` (`Object.<string, Array<string>>`): Additional configuration to merge with `options.dynamic.resolutions`.

### Configuration examples

Here is an illustrative sample:

```yml
# Global options
options:
  # Number of parallel processes to use for bundling.
  #
  # - Defaults to `1` process, which serially runs each bundle.
  # - `1`/serial mode is run in the same process as `trace-pkg`.
  # - Setting to `0` will use number of CPUs detected on machine.
  # - Can be overridden by `--concurrency=<NUMBER>` command line option.
  concurrency: <NUMBER>

  # Current working directory - OPTIONAL (default: `process.cwd()`)
  #
  # Directory from which to read input files as well as output zip bundles.
  cwd: /ABSOLUTE/PATH (or) ./a/relative/path/to/process.cwd

# Each "package" corresponds to an outputted zip file. It can contain an number
# of traced or straight included files.
packages:
  # FULL OPTIONS
  # ============
  # Keys should be designated according to zip file name without the ".zip"
  # suffix.
  <PKG_NAME>:
    # Current working directory - OPTIONAL (default: `options.cwd` value)
    cwd: /ABSOLUTE/PATH (or) ./a/relative/path/to/process.cwd

    # Output file path - OPTIONAL (default: `[packages.<NAME>].zip`)
    # File path (absolute or relative to `cwd` option) for output bundle.
    output: ../artifacts/PKG_NAME.zip

    # Absolute or CWD-relative file paths to trace and include all dependent files.
    #
    # - Must be JavaScript or JSON files capable of being `require|import`-ed by Node.js.
    # - May be glob patterns.
    trace:
      - <ENTRY_POINT_OR_PATTERN_ONE>.js
      - <ENTRY_POINT_TWO>.js

    # Absolute or CWD-relative file paths to straight include without tracing or introspection
    #
    # - May be any type of file on disk.
    # - May be glob patterns.
    include:
      - <FILE_OR_PATTERN_ONE>.js
      - <FILE_TWO>.js

    # Package path prefixes up to a directory level to skip tracing on.
    ignores:
      - PKG_NAME (or) PKG_NAME/SUB_DIR/

    # Package keys with sub-dependencies to allow to be missing.
    allowMissing:
      PKG_NAME:
        - SUB_PKG_NAME_ONE
        - SUB_PKG_NAME_TWO

  # EXAMPLES
  # ========
  my-function:                # produces `my-function.zip`
    trace:
      - src/server.js         # trace individual file `src/server.js`
      - src/config/**/*.js    # trace all JS files in `src/config`
    include:
      - assets/**/*.css       # include all CSS files in `assets`
    ignores:
      - "aws-sdk"             # Skip pkgs already installed on Lambda
    allowMissing:
      "ws":                   # Ignore optional, lazy imported dependencies in `ws` package.
        - "bufferutil"
        - "utf-8-validate"
```

## Notes

### Packaged files

Like the [Serverless framework][], `trace-pkg` attempts to create deteriministic zip files wherein the same source files should produce a byte-wise identical zip file. We do this via two primary means:

- Source files are sorted in order of insertion into the zip archive.
- Source files have `mtime` file metadata set to the UNIX epoch.

### Comparison to serverless-jetpack

For those familiar with the [Serverless framework][], this project provides the packaging speed of the [serverless-jetpack][] plugin as both use the same [underlying tracing library][trace-deps], just without the actual Serverless Framework.

- [ ] TODO: Document differences in configuration.

[npm_img]: https://badge.fury.io/js/trace-pkg.svg
[npm_site]: http://badge.fury.io/js/trace-pkg
[actions_img]: https://github.com/FormidableLabs/trace-pkg/workflows/CI/badge.svg
[actions_site]: https://github.com/FormidableLabs/trace-pkg/actions
[cov_img]: https://codecov.io/gh/FormidableLabs/trace-pkg/branch/master/graph/badge.svg
[cov_site]: https://codecov.io/gh/FormidableLabs/trace-pkg

[trace-deps]: https://github.com/FormidableLabs/trace-deps
[Serverless framework]: https://www.serverless.com/
[serverless-jetpack]: https://github.com/FormidableLabs/serverless-jetpack
[fast-glob]: https://github.com/mrmlnc/fast-glob
