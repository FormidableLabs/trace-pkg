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
  -c, --config   Path to configuration file                             [string]
  -h, --help     Show help                                             [boolean]
  -v, --version  Show version number                                   [boolean]
```

## Configuration

`trace-pkg` can be configured via a YAML, JavaScript, or JSON file.

Here is an illustrative sample:

```yml
# Global options
options:
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
  <ZIP_FILE_NAME>:
    # Current working directory - OPTIONAL (default: `options.cwd` value)
    cwd: /ABSOLUTE/PATH (or) ./a/relative/path/to/process.cwd

    # Output file path - OPTIONAL (default: `[packages.<NAME>].zip`)
    # File path (absolute or relative to `cwd` option) for output bundle.
    output: ../artifacts/ZIP_FILE_NAME.zip

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

  # EXAMPLES
  # ========
  my-function:                # produces `my-function.zip`
    trace:
      - src/server.js         # trace individual file `src/server.js`
      - src/config/**/*.js    # trace all JS files in `src/config`
    include:
      - assets/**/*.css       # include all CSS files in `assets`

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
