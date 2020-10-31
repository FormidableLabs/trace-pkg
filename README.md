trace-pkg 📦
============

[![npm version][npm_img]][npm_site]
[![Travis Status][trav_img]][trav_site]
[![AppVeyor Status][appveyor_img]][appveyor_site]
[![Coverage Status][cov_img]][cov_site]

A dependency tracing packager for Node.js source files.

## Overview

`trace-pkg` is a packager for Node.js applications. It ingests entry point files, then uses the [trace-deps][] library to infer all other source files imported at runtime, and then creates a zip bundle suitable for use with AWS Lambda, Serverless, etc.

## Usage

- [ ] TODO: Example usage

## Configuration

`trace-pkg` can be configured via CLI options or a YAML, JavaScript, or JSON file.

- [ ] TODO: An output directory (e.g., `.serverless`).

Here is an illustrative sample:

```yml
# Each "package" corresponds to an outputted zip file. It can contain an number
# of traced or straight included files.
packages:
  # Keys should be designated according to zip file name without the ".zip"
  # suffix.
  <ZIP_FILE_NAME>:
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

  # Examples:
  my-function:                # produces `my-function.zip`
    trace:
      - src/server.js         # trace individual file `src/server.js`
      - src/config/**/*.js    # trace all JS files in `src/config`
    include:
      - assets/**/*.css       # include all CSS files in `assets`

```

## Notes

### Comparison to serverless-jetpack

For those familiar with the [Serverless framework][], this project provides the packaging speed of the [serverless-jetpack][] plugin as both use the same [underlying tracing library][trace-deps], just without the actual Serverless Framework.

- [ ] TODO: Document differences in configuration.

[npm_img]: https://badge.fury.io/js/trace-pkg.svg
[npm_site]: http://badge.fury.io/js/trace-pkg
[trav_img]: https://api.travis-ci.com/FormidableLabs/trace-pkg.svg
[trav_site]: https://travis-ci.com/FormidableLabs/trace-pkg
[appveyor_img]: https://ci.appveyor.com/api/projects/status/github/formidablelabs/trace-pkg?branch=master&svg=true
[appveyor_site]: https://ci.appveyor.com/project/FormidableLabs/trace-pkg
[cov_img]: https://codecov.io/gh/FormidableLabs/trace-pkg/branch/master/graph/badge.svg
[cov_site]: https://codecov.io/gh/FormidableLabs/trace-pkg

[trace-deps]: https://github.com/FormidableLabs/trace-deps
[Serverless framework]: https://www.serverless.com/
[serverless-jetpack]: https://github.com/FormidableLabs/serverless-jetpack
