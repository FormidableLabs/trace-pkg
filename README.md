trace-pkg 📦
============

[![npm version][npm_img]][npm_site]
[![Actions Status][actions_img]][actions_site]
[![Coverage Status][cov_img]][cov_site]

A blazingly fast Node.js zip application packager for AWS Lambda, etc.

- 🔥 **Fast**: Efficient, concurrent packaging with full multi-cpu utilization.
- 🔎 **Small**: Dependency tracing to include **only** the files your application uses.
- ⚙️ **Flexible**: Highly tunable configuration/introspection for dynamic, optional import handling.

## Overview

`trace-pkg` is a packager for Node.js applications. It ingests entry point files, then uses the [trace-deps][] library to infer all other source files imported at runtime, and then creates a zip bundle suitable for use with AWS Lambda, Serverless, etc.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Usage](#usage)
- [Configuration](#configuration)
  - [Configuration options](#configuration-options)
    - [Global options](#global-options)
    - [Per-package options](#per-package-options)
  - [Configuration examples](#configuration-examples)
- [Notes](#notes)
  - [Handling dynamic import misses](#handling-dynamic-import-misses)
  - [Handling collapsed files](#handling-collapsed-files)
  - [Including source maps](#including-source-maps)
  - [Packaged files](#packaged-files)
  - [Related projects](#related-projects)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Usage

```
Usage: trace-pkg [options]

Options:
  -c, --config       Path to configuration file              [string] [required]
      --concurrency  Parallel processes to use (default: 1)            [number]
  -d, --dry-run      Don't actually produce output bundle              [boolean]
  -r, --report       Generate extended report                          [boolean]
  -s, --silent       Don't output logs to the console                  [boolean]
  -h, --help         Show help                                         [boolean]
  -v, --version      Show version number                               [boolean]
```

## Configuration

`trace-pkg` can be configured via a YAML, JavaScript, or JSON file with additional CLI options.

### Configuration options

Configuration options are generally global (`options.<OPTION_NAME>`) and/or per-package (`packages.<PKG_NAME>.<OPTION_NAME>`). When there is both a global _and_ per-package option, the global option is applied _first_ then the per-package option is added to it. For an array option, that means additional unique items are added in. For an object option, this means that for each key in the object additional unique items in the array value are added in.

#### Global options

- `options.cwd` (`String`): Current working directory from which to read input files as well as output zip bundles (default: `process.cwd()`).
- `options.concurrency` (`Number`): The number of independent package tasks to run off the main execution thread. If `1`, then run tasks serially in main thread. If `2+` run off main thread with `concurrency` number of workers. If `0`, then use "number of CPUs" value. (default: `1`).
    - Can be overridden from CLI with `--concurrency <NUMBER>`
- `options.includeSourceMaps` (`Boolean`): Include source map paths from files that are found during tracing (not inclusion via `include`) and present on-disk. Source map paths inferred but not found are ignored. (default: `false`). Please see [discussion below](#including-source-maps) to evaluate whether or not you should use this feature.
- `options.ignores` (`Array<string>`): A set of package path prefixes up to a directory level (e.g., `react` or `mod/lib`) to skip tracing on. This is particularly useful when you are excluding a package like `aws-sdk` that is already provided for your lambda.
- `options.allowMissing` (`Object.<string, Array<string>>`): A way to allow certain packages to have potentially failing dependencies. Specify each object key as either (1) an source file path relative to `cwd` that begins with a `./` or (2) a package name and privide a value as an array of dependencies that _might_ be missing on disk. If the sub-dependency is found, then it is included in the bundle (this part distinguishes this option from `ignores`). If not, it is skipped without error.
- `options.dynamic.resolutions` (`Object.<string, Array<string>>`): Handle dynamic import misses by providing a key to match misses on and an array of additional glob patterns to trace and include in the application bundle.
    - _Application source files_: If a miss is an application source file (e.g., not within `node_modules`), specify the **relative path** (from the package-level `cwd`) to it like `"./src/server/router.js": [/* array of patterns */]`.
        - **Note**: To be an application source path, it **must** be prefixed with a dot (e.g., `./src/server.js`, `../lower/src/server.js`). Basically, like the Node.js `require()` rules go for a local path file vs. a package dependency.
        - **Warning**: When resolving relative paths, the **package-level** `cwd` value applies. If you have different `cwd` configurations per-packaged/globally, then (dot-prefixed) resolution keys should only be specified in `packages.<PKG_NAME>.dynamic.resolutions` and **not** `options.dynamic.resolutions`.
    - _Dependency packages_: If a miss is part of a dependency (e.g., an `npm` package placed within `node_modules`), specify the **package name** first (without including `node_modules`) and then trailing path to file at issue like `"bunyan/lib/bunyan.js": [/* array of patterns */]`.
    - _Ignoring dynamic import misses_: If you just want to ignore the missed dynamic imports for a given application source file or package, just specify and empty array `[]` or falsy value.
- `options.dynamic.bail` (`Boolean`): Exit CLI with error if dynamic import misses are detected. (default: `false`). See [discussion below](#handling-dynamic-import-misses) regarding handling.
- `options.collapsed.bail` (`Boolean`): Exit CLI with error if collapsed file conflicts are detected. (default: `true`). See [discussion below](#handling-collapsed-files) regarding collapsed files.

#### Per-package options

- `packages.<PKG_NAME>.cwd` (`String`): Override global `cwd` option. (default: `option.cwd` value).
- `packages.<PKG_NAME>.output` (`String`): File path (absolute or relative to `cwd` option) for output bundle. (default: `[packages.<NAME>].zip`).
- `packages.<PKG_NAME>.include` (`Array<string>`): A list of glob patterns to include/exclude in the package per [fast-glob][] globbing rules. Matched files are **not** traced for further dependencies are suitable for any file type that should end up in the bundle. Use this option for files that won't automatically be traced into your bundle.
- `packages.<PKG_NAME>.trace` (`Array<string>`): A list of [fast-glob][] glob patterns to match JS files that will be further traced to infer all imported dependencies via static analysis. Use this option to include your source code files that comprises your application.
- `packages.<PKG_NAME>.includeSourceMaps` (`Boolean`): Additional configuration to override value of `options.includeSourceMaps`.
- `packages.<PKG_NAME>.ignores` (`Array<string>`): Additional configuration to merge with `options.ignores`.
- `packages.<PKG_NAME>.allowMissing` (`Object.<string, Array<string>>`): Additional configuration to merge with `options.allowMissing`. Note that for source file paths, all of the paths are resolved to `cwd`, so if you provide both a global and package-level `cwd` the relative paths probably won't resolve as you would expect them to.
- `packages.<PKG_NAME>.dynamic.resolutions` (`Object.<string, Array<string>>`): Additional configuration to merge with `options.dynamic.resolutions`.
- `packages.<PKG_NAME>.dynamic.bail` (`Boolean`): Override `options.dynamic.bail` value.
- `packages.<PKG_NAME>.collapsed.bail` (`Boolean`): Override `options.collapsed.bail` value.

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

  # Include reference source maps from traced files? (default: `false`)
  includeSourceMaps: true (or) false

  # Package path prefixes up to a directory level to skip tracing on.
  ignores:
    - PKG_NAME (or) PKG_NAME/SUB_DIR/

  # Package keys with sub-dependencies to allow to be missing.
  allowMissing:
    PKG_NAME:
      - SUB_PKG_NAME_ONE
      - SUB_PKG_NAME_TWO

  collapsed:
    # Error if any collapsed files in zip are found (default: `true`)
    bail: true (or) false

  dynamic:
    # Error if any dynamic misses are unresolved (default: `false`)
    bail: true (or) false

    # Resolve encountered dynamic import misses, either by tracing
    # additional files, or ignoring after confirmation of safety.
    resolutions:
      # **Application Source**
      #
      # Specify keys as relative path to application source files starting
      # with a dot.
      "./RELATIVE/PATH/TO/FILE.js":
        - "../SOME/OTHER/RELATIVE/FILE.js"
        - "PKG_NAME" (or) "PGK_NAME/WITH/PATH.js"

      # **Dependencies**
      #
      # Specify keys as `PKG_NAME/path/to/file.js`.
      "PGK_NAME/WITH/PATH.js":
        - "../SOME/OTHER/RELATIVE/FILE.js"
        - "PKG_NAME" (or) "PGK_NAME/WITH/PATH.js"

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

    # Extensions of `options.*` fields below...
    includeSourceMaps: false
    ignores: []
    allowMissing: {}
    collapsed:
      bail: true
    dynamic:
      bail: true
      resolutions: {}

  # EXAMPLES
  # ========
  my-function:                # Produces `my-function.zip`
    trace:
      - src/server.js         # Trace individual file `src/server.js`
      - src/config/**/*.js    # Trace all JS files in `src/config`

    includeSourceMaps: true   # Include referenced source maps found on disk for traced files

    include:
      - assets/**/*.css       # Include all CSS files in `assets`

    ignores:
      - "aws-sdk"             # Skip pkgs already installed on Lambda

    allowMissing:
      "./src/app/path.js":    # Application code with allowed missing dependencies.
        - "missing-pkg-within-app-sources"
      "ws":                   # Ignore optional, lazy imported dependencies in `ws` package
        - "bufferutil"
        - "utf-8-validate"

    collapsed:
      bail: true              # Error on collapsed files in zip.

    dynamic:
      bail: true              # Error on unresolved dynamic misses.

      resolutions:
        # **Application Source**
        "./src/server/config.js":
          # Manually trace all configuration files for bespoke configuration
          # application code. (Note these are relative to the file key!)
          - "../../config/default.js"
          - "../../config/production.js"

        # Ignore dynamic import misses with empty array.
        "./src/something-else.js": []

        # **Dependencies**
        "bunyan/lib/bunyan.js":
          # - node_modules/bunyan/lib/bunyan.js [79:17]: require('dtrace-provider' + '')
          # - node_modules/bunyan/lib/bunyan.js [100:13]: require('mv' + '')
          # - node_modules/bunyan/lib/bunyan.js [106:27]: require('source-map-support' + '')
          #
          # These are all just try/catch-ed permissive require's meant to be
          # excluded in browser. We manually add them in here.
          - "dtrace-provider"
          - "mv"
          - "source-map-support"

        # Ignore: we aren't using themes.
        # - node_modules/colors/lib/colors.js [127:29]: require(theme)
        "colors/lib/colors.js": []
```

## Notes

### Handling dynamic import misses

Dynamic imports that use variables or runtime execution like `require(A_VARIABLE)` or ``import(`template_${VARIABLE}`)`` cannot be used by `trace-pkg` to infer what the underlying dependency files are for inclusion in the bundle. That means some level of developer research and configuration to handle.

**Identify**

The first step is to be aware and watch for dynamic import misses. Conveniently, `trace-pkg` logs warnings like the following:

```
WARN Dynamic misses in .package/one:
- /PATH/TO/PROJECT/node_modules/bunyan/lib/bunyan.js
  [79:17]: require('dtrace-provider' + '')
  [100:13]: require('mv' + '')
  [106:27]: require('source-map-support' + '')
WARN To resolve dynamic import misses, see logs & read: https://npm.im/trace-pkg#handling-dynamic-import-misses
```

and produces combined `--report` output like:

```yaml
## Output

.package/one:
  # ...
  misses:
    resolved: []
    missed:
      /PATH/TO/PROJECT/node_modules/bunyan/lib/bunyan.js:
        - "[79:17]: require('dtrace-provider' + '')"
        - "[100:13]: require('mv' + '')"
        - "[106:27]: require('source-map-support' + '')"
```

which gives you the line + column number of the dynamic dependency in a given source file and snippet of the code in question.

In addition to just logging this information, you can ensure you have no unaccounted for dynamic import misses by setting `dynamic.bail = true` in `options` or `packages.<PKG_NAME>`-level configuration.

**Diagnose**

With the `--report` output in hand, the recommended course is to identify what the impact is of these missed dynamic imports. For example, in `node_modules/bunyan/lib/bunyan.js` the interesting `require('mv' + '')` import is within a permissive try/catch block to allow conditional import of the library if found (and prevent `browserify` from bundling the library). For our application we could choose to ignore these dynamic imports or manually add in the imported libraries.

For other dependencies, there may well be "hidden" dependencies that you will need to add to your zip bundle for runtime correctness. Things like `node-config` which dynamically imports various configuration files from environment variable information, etc.

**Remedy**

Once we have logging information and the `--report` output, we can start remedying dynamic import misses via the `dynamic.resolutions` configuration option. Resolutions are keys to files with dynamic import misses that allow a developer to specify what imports _should_ be included manually or to simply ignore the dynamic import misses.

**Keys**: Resolutions take a key value to match each file with missing dynamic imports. There are two types of keys that are used:

- **Application Source File**: Something that is within your application and **not** `node_modules`. Specify these files with a dot prefix as appropriate relative to your package current working directory (`cwd`) like `./src/server.js` or `../outside/file.js`.
- **Package Dependencies**: A file from a dependency within `node_modules`. Specify these files without a dot and just `PKG_NAME/path/to/file.js` or `@SCOPE/PKG_NAME/path/to/file.js`.

**Values**: Values are an array of extra imports to add in from each file as if they were declared in that very file with `require("EXTRA_IMPORT")` or `import "EXTRA_IMPORT"`. This means the values should either be _relative paths within that package_ (`./lib/auth/noop.js`) or other package dependencies (`lodash` or `lodash/map.js`).

- **Note**: We choose to support "additional imports" and not just file glob additions like `packages.<PKG_NAME>.include`. The reason is that for package dependency import misses, the packages can be flattened to unpredictable locations in the `node_modules` trees and doubly so in monorepos. An import will always be resolved to the correct location, and that's why we choose it.

Some examples:

[`bunyan`](https://github.com/trentm/node-bunyan): The popular logger library has some optional dependencies that are not meant only for Node.js. To prevent browser bundling tools from including, they use a curious `require` strategy of `require('PKG_NAME' + '')` to defeat parsing. In `trace-pkg`, this means we get dynamic misses reports of:

```yml
/PATH/TO/PROJECT/node_modules/bunyan/lib/bunyan.js:
  - "[79:17]: require('dtrace-provider' + '')"
  - "[100:13]: require('mv' + '')"
  - "[106:27]: require('source-map-support' + '')"
```

Using `resolutions` we can remedy these by simple adding imports for all three libraries like:

```yml
dynamic:
  resolutions:
    "bunyan/lib/bunyan.js":
      - "dtrace-provider"
      - "mv"
      - "source-map-support"
```

[`express`](https://expressjs.com/): The popular server framework dynamically imports engines which produces a dynamic misses report of:

```yml
/PATH/TO/PROJECT/mode_modules/express/lib/view.js:
  - "[81:13]: require(mod)"
```

In a common case, this is a non-issue if you aren't using engines, so we can simply "ignore" the import miss by setting an empty array `resolutions` value:

```yml
dynamic:
  resolutions:
    "express/lib/view.js": []
```

Once we have analyzed all of our misses and added `resolutions` to either ignore the miss or add other imports, we can then set `dynamic.bail = true` to make sure that if future dependency upgrades adds new, unhandled dynamic misses we will get a failed build notification so we know that we're always deploying known, good code.

### Handling collapsed files

**How files are zipped**

Adding files above the current working directory (`cwd`) has the potential to lead to potential correctness issues and hard-to-find bugs. For example, if you have files like:

```yml
- src/foo/bar.js
- ../node_modules/lodash/index.js
```

Any file above `cwd` is collapsed into starting **at** current working directory and not above it. So, for the above example, we package and then later expand to:

```yml
- src/foo/bar.js                # The same.
- node_modules/lodash/index.js  # Removed `../`!!!
```

This often can happen with `node_modules` in monorepos where `node_modules` roots are scattered across different directories and nested. Fortunately, in most cases, it's not that big of a deal. For example:

```yml
- node_modules/chalk/index.js
- ../node_modules/lodash/index.js
```

will collapse when zipped to:

```yml
- node_modules/chalk/index.js
- node_modules/lodash/index.js
```

... but Node.js [resolution rules](https://nodejs.org/api/modules.html#modules_all_together) should resolve and load the collapsed package the same as if it were in the original location.

**Zipping problems**

The real problems occur if there is a path conflict where files collapse to the **same location**. For example, if we have:

```yml
- node_modules/lodash/index.js
- ../node_modules/lodash/index.js
```

this will append files with the same path in the zip file:

```yml
- node_modules/lodash/index.js
- node_modules/lodash/index.js
```

thus collapsing to only **one** file that is later expanded on disk.

**Detecting collapsed files**

The first step to remedying such as situation is _detecting_ potentially collapsed files that conflict. `trace-pkg` does this automatically with log warnings like:

```
WARN Collapsed sources in one (1 conflicts, 2 files): server.js
WARN Collapsed dependencies in one (1 packages, 2 conflicts, 4 files): lodash
WARN To address collapsed file conflicts, see logs & read: https://npm.im/trace-pkg#handling-collapsed-files
```

In the above example, collapsed "sources" are application files _outside_ of `node_modules` that were collapsed. Collapsed "dependencies" are files that are part of `node_modules` packages that we summarize for convenience at the package name level. Typically, projects encountering collapsed file conflicts do so with dependencies in a monorepo or other structure that packages above the current working directory.

To ensure you never accidentally miss collapsed files, the `options` / `packages.<PKG_NAME>` field is set by default to `collapsed.bail = true` so that `trace-pkg` will throw an error if any collapsed conflicts are detected. Please consider keeping this enabled to save you from potentially bad production runtime errors!

**Solving collapsed file conflicts**

So how do we fix the problem?

The absolute first and foremost answer is to **set `cwd` and run `trace-pkg` from at the root of your project**.

For example, if you have a monorepo like:

```
node_modules/**
packages/
  one/
    handler.js
    node_modules/**
  two/
    handler.js
    node_modules/**
```

Set up your configuration with the handlers from full paths (e.g., `packages/one|two/handler.js`) and package from the root of the project. By contrast, if you set `cwd` to `packages/one|two` and have Lambda handler configurations pointing to `index.js` within those `cwd`s, then you risk have collapsed files.

If you absolutely _must_ set `cwd` in a manner where files may be included in the zip file above it, then here are some additional tips:

- **Start with a report**: Generate a full packaging report with the CLI `--report` option (for faster reports, also use `--dry-run` to skip zip file creation). Inspect the logs and the complete list of `collapsed` files per package in the output. Then, with an understanding of what is being collapsed consider some of the following heuristics / tweaks....

- **Mirror exact same dependencies in `package.json`s**: In our previous example with two `lodash`s, even if `lodash` isn't declared in either `../package.json` or `package.json` we can manually add it to both at the same pinned version (e.g., `"lodash": "4.17.15"`) to force it to be the same no matter where npm or Yarn place the dependency on disk.

- **Use Yarn Resolutions**: If you are using Yarn and [resolutions](https://classic.yarnpkg.com/en/docs/selective-version-resolutions/) are an option that works for your project, they are a straightforward way to ensure that only one of a dependency exists on disk, solving collapsing problems.

... but ultimately the above hacks are fairly brittle and not general purpose fixes. Do yourself a favor, and just always run with `cwd` at the project root. 😉

### Including source maps

Node.js application files are often transpiled from some original source code into a final runtime application file with tools like Babel, TypeScript, etc. Source map files are large JSON files that map the runtime file back to the original source file for things like exception stack traces, etc. When produced by tooling for Node.js applications are typically placed next to the application file (e.g., `app.js` has `app.js.map` file at the same level).

`trace-pkg` will add source map files to output zip bundles that exist on disk that are reference in `sourceMappingURL` comments in application source files discovered in `trace` configurations when `includeSourceMaps = true` in `options` or `packages.<PKG_NAME>`-level configuration. Files added via `include` will **not** have source map files automatically added, but your glob pattern for `include` should be able to easily _also_ include ones for analogous `*.map` files (this avoids expensive additional file I/O that tracing does not).

**Should I include source maps in my bundle?**

OK, so we _can_ include source maps in our output bundles. The bigger question is **should** we?

Source maps in frontend web applications that accompany minimized application code are often critical for debugging so that frontend developers can actually read and debug the otherwise gibberish code. But for backend Node.js application code, the transpiled files are typically very readable with real variable names, spacing, etc. It is thus typically of less importance to have full source map support for Node.js code.

_Source map benefits_:

- **Node.js stack traces**: If you are running in Node v12+ with the [experimental `--enable-source-maps` flag](https://nodejs.org/dist/latest-v12.x/docs/api/cli.html#cli_enable_source_maps) enabled, then Node.js will translate runtime errors to stack traces to original source files.
- **Error aggregation**: Some other services, like error aggregation services, can use the source maps to similarly gather runtime exceptions and translate stack traces.
    - It should be mentioned, however, that many of these services do not need the source maps to be colocated with the application source code in the runtime, but can instead be uploaded directly to the service.

_Source map drawbacks_:

- **Zip bundle size impact**: Source map files vary in size but are often almost the same byte size as the transpiled application source file. This means that for every application file that you trace and include a source map with you will be nearly **doubling** the size in your ultimate application bundle. As `trace-pkg` is typically zipping files for use in AWS Lambda, keeping bundle size as slim as possible is a critical best practice -- there are limits on the size of a zip file you are allowed to deploy, and anecdotal (but common) data that larger bundles tend to perform worse in production.

### Packaged files

Like the [Serverless framework][], `trace-pkg` attempts to create deterministic zip files wherein the same source files should produce a byte-wise identical zip file. We do this via two primary means:

- Source files are sorted in order of insertion into the zip archive.
- Source files have `mtime` file metadata set to the UNIX epoch.

### Related projects

**[serverless-jetpack][]**

For those familiar with the [Serverless framework][], this project provides the packaging speed of the [serverless-jetpack][] plugin as both use the same [underlying tracing library][trace-deps], just without the actual Serverless Framework. This project was created from the successes of `serverless-jetpack`'s [tracing mode][] when our use cases needed standalone packages for Terraform-based AWS Lambda deployments that didn't use the `serverless` framework. Much of our documentation is incorporated and refactored slightly for the minor differences in `trace-pkg`.

If you are using the `serverless` framework, definitely give `serverless-jetpack` a whirl!

[npm_img]: https://badge.fury.io/js/trace-pkg.svg
[npm_site]: http://badge.fury.io/js/trace-pkg
[actions_img]: https://github.com/FormidableLabs/trace-pkg/workflows/CI/badge.svg
[actions_site]: https://github.com/FormidableLabs/trace-pkg/actions
[cov_img]: https://codecov.io/gh/FormidableLabs/trace-pkg/branch/main/graph/badge.svg
[cov_site]: https://codecov.io/gh/FormidableLabs/trace-pkg

[trace-deps]: https://github.com/FormidableLabs/trace-deps
[Serverless framework]: https://www.serverless.com/
[serverless-jetpack]: https://github.com/FormidableLabs/serverless-jetpack
[tracing mode]: https://github.com/FormidableLabs/serverless-jetpack#tracing-mode
[fast-glob]: https://github.com/mrmlnc/fast-glob
