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

- [ ] TODO: Configuration (with configuration files)

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
