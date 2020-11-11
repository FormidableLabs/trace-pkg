"use strict";

const mock = require("mock-fs");
const sinon = require("sinon");
const globby = require("globby");

const createPackage = require("../../../lib/actions/package").package;

const { zipContents } = require("../../util/file");

describe("lib/actions/package", () => {
  let sandbox;
  let logStub;

  beforeEach(() => {
    mock({});
    sandbox = sinon.createSandbox();
    logStub = sandbox.stub(console, "log");
  });

  afterEach(() => {
    sandbox.restore();
    mock.restore();
  });

  it("fails if any package contains zero matched files", async () => {
    mock({
      src: {
        "one.js": "module.exports = \"one\";",
        "two.json": "{ \"msg\": \"two\" }"
      }
    });

    await expect(createPackage({
      opts: {
        config: {
          packages: {
            one: {
              trace: [
                "src/one.js"
              ]
            },
            two: {
              include: [
                "src/two.*"
              ]
            },
            "no-files": {
              trace: [
                "no-match"
              ],
              include: [
                "also-no-match"
              ]
            }
          }
        }
      }
    })).to.eventually.be.rejectedWith(
      "Did not find any matching files for bundle: \"no-files\""
    );
  });

  it("packages across multiple different working directories", async () => {
    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": "module.exports = require('./deeper/dep');",
          deeper: {
            "dep.js": "module.exports = \"deeper-dep\";"
          }
        },
        "two.json": "{ \"msg\": \"two\" }",
        "two.css": "body.two { background-color: pink; }",
        three: {
          "index.js": "module.exports = \"three\";"
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          options: {
            cwd: "src"
          },
          packages: {
            "../../.build/one": {
              cwd: "src/one",
              trace: [
                "../one.js"
              ]
            },
            two: {
              output: "../.build/two.zip",
              include: [
                "two.*"
              ]
            },
            three: {
              cwd: "src/three",
              output: "../../.build/three.zip",
              trace: [
                "index.js"
              ],
              include: [
                "index.js" // Double include (should only have one file in zip)
              ]
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 3 packages:");

    expect(await globby(".build/*.zip")).to.eql([
      ".build/one.zip",
      ".build/three.zip",
      ".build/two.zip"
    ]);
    expect(zipContents(".build/one.zip")).to.eql([
      "one.js",
      "deeper/dep.js",
      "dep.js"
    ]);
    expect(zipContents(".build/two.zip")).to.eql([
      "two.css",
      "two.json"
    ]);
    expect(zipContents(".build/three.zip")).to.eql([
      "index.js"
    ]);
  });

  it("outputs zip files to multiple different locations", async () => {
    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": "module.exports = require('./deeper/dep');",
          deeper: {
            "dep.js": "module.exports = \"deeper-dep\";"
          }
        },
        "two.json": "{ \"msg\": \"two\" }",
        "two.css": "body.two { background-color: pink; }"
      }
    });

    await createPackage({
      opts: {
        config: {
          packages: {
            "one.zip": {
              trace: [
                "src/one.js"
              ]
            },
            two: {
              include: [
                "src/two.*"
              ]
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 2 packages:");

    expect(await globby("*.zip")).to.eql([
      "one.zip",
      "two.zip"
    ]);
    expect(zipContents("one.zip")).to.eql([
      "src/one.js",
      "src/one/deeper/dep.js",
      "src/one/dep.js"
    ]);
    expect(zipContents("two.zip")).to.eql([
      "src/two.css",
      "src/two.json"
    ]);
  });

  it("packages monorepos", async () => {
    mock({
      "package.json": JSON.stringify({}),
      functions: {
        one: {
          "index.js": "module.exports = require('./src/dep');",
          src: {
            "dep.js": "module.exports = require('./deeper/dep');",
            deeper: {
              "dep.js": `
                require("local-nm-pkg");
                require("root-nm-pkg");
                module.exports = "deeper-dep";
              `
            }
          },
          "package.json": JSON.stringify({
            main: "index.js"
          }),
          node_modules: {
            "local-nm-pkg": {
              "package.json": JSON.stringify({
                main: "index.js"
              }),
              "index.js": "module.exports = 'local-nm-pkg';"
            }
          }
        },
        two: {
          "index.js": "module.exports = require(\"local-nm-pkg-two\");",
          src: {
            "two.json": "{ \"msg\": \"two\" }",
            "two.css": "body.two { background-color: pink; }"
          },
          "package.json": {
            main: "./index.js"
          },
          node_modules: {
            "local-nm-pkg-two": {
              "package.json": JSON.stringify({
                main: "index.js"
              }),
              "index.js": "module.exports = 'local-nm-pkg-two';"
            }
          }
        },
        node_modules: {
          "root-nm-pkg": {
            "package.json": JSON.stringify({
              main: "main.js"
            }),
            "main.js": "module.exports = 'root-nm-pkg';"
          }
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          packages: {
            one: {
              cwd: "functions/one",
              output: "../../.build/one.zip",
              trace: [
                "index.js"
              ]
            },
            two: {
              cwd: "functions/two",
              output: "../../.build/two.zip",
              trace: [
                "index.js"
              ],
              include: [
                "src/two.*"
              ]
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 2 packages:");

    expect(await globby(".build/*.zip")).to.eql([
      ".build/one.zip",
      ".build/two.zip"
    ]);
    expect(zipContents(".build/one.zip")).to.eql([
      // Note: `root-nm-pkg` appears out of sorted order because collapsed
      // from `../../node_modules/root-nm-pkg/index.js`.
      "node_modules/root-nm-pkg/main.js",
      "node_modules/root-nm-pkg/package.json",
      "index.js",
      "node_modules/local-nm-pkg/index.js",
      "node_modules/local-nm-pkg/package.json",
      "package.json",
      "src/deeper/dep.js",
      "src/dep.js"
    ]);
    expect(zipContents(".build/two.zip")).to.eql([
      "index.js",
      "node_modules/local-nm-pkg-two/index.js",
      "node_modules/local-nm-pkg-two/package.json",
      "src/two.css",
      "src/two.json"
    ]);
  });

  it("ignores missing packages", async () => {
    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": `
            require('missing-dep');
            require('missing/with/path/file.js');

            module.exports = "dep";
          `
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          options: {
            ignores: [
              "missing-dep"
            ]
          },
          packages: {
            "one.zip": {
              trace: [
                "src/one.js"
              ],
              ignores: [
                "missing/with" // could have `/path` added
              ]
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 1 packages:");

    expect(await globby("*.zip")).to.eql([
      "one.zip"
    ]);
    expect(zipContents("one.zip")).to.eql([
      "src/one.js",
      "src/one/dep.js"
    ]);
  });

  it("ignores skipped packages", async () => {
    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": `
            require('present-but-skipped');

            module.exports = "dep";
          `
        }
      },
      node_modules: {
        "present-but-skipped": {
          "package.json": JSON.stringify({
            main: "index.js"
          }),
          "index.js": "module.exports = 'present-but-skipped';"
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          packages: {
            "one.zip": {
              trace: [
                "src/one.js"
              ],
              ignores: [
                "present-but-skipped"
              ]
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 1 packages:");

    expect(await globby("*.zip")).to.eql([
      "one.zip"
    ]);
    expect(zipContents("one.zip")).to.eql([
      "src/one.js",
      "src/one/dep.js"
    ]);
  });

  it("skips allowed missing packages", async () => {
    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": `
            require('dep');

            module.exports = "dep";
          `
        }
      },
      node_modules: {
        dep: {
          "package.json": JSON.stringify({
            main: "index.js"
          }),
          "index.js": `
            // Will be packaged.
            require('present-but-allowed-to-be-missing');
            // WIll be omitted without error.
            require('missing');

            module.exports = "dep";
          `
        },
        "present-but-allowed-to-be-missing": {
          "package.json": JSON.stringify({
            main: "index.js"
          }),
          "index.js": "module.exports = 'present-but-allowed-to-be-missing';"
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          options: {
            allowMissing: {
              dep: [
                "missing"
              ]
            }
          },
          packages: {
            "one.zip": {
              trace: [
                "src/one.js"
              ],
              allowMissing: {
                dep: [
                  "present-but-allowed-to-be-missing"
                ]
              }
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 1 packages:");

    expect(await globby("*.zip")).to.eql([
      "one.zip"
    ]);
    expect(zipContents("one.zip")).to.eql([
      "node_modules/dep/index.js",
      "node_modules/dep/package.json",
      "node_modules/present-but-allowed-to-be-missing/index.js",
      "node_modules/present-but-allowed-to-be-missing/package.json",
      "src/one.js",
      "src/one/dep.js"
    ]);
  });

  it("resolves dynamic misses", async () => {
    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": `
            require(process.env.DYNAMIC_ONE);

            module.exports = "dep";
          `,
          "extra-app-file.js": "module.exports = 'extra-app-file';"
        }
      },
      node_modules: {
        dep: {
          "package.json": JSON.stringify({
            main: "index.js"
          }),
          "index.js": `
            require(process.env.DYNAMIC_TWO);

            module.exports = "dep";
          `
        },
        "another-dep": {
          "package.json": JSON.stringify({
            main: "index.js"
          }),
          "index.js": "module.exports = 'another-dep';"
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          options: {
            dynamic: {
              resolutions: {
                "dep/index.js": [
                  "another-dep"
                ]
              }
            }
          },
          packages: {
            "one.zip": {
              trace: [
                "src/one.js"
              ],
              dynamic: {
                resolutions: {
                  "./src/one/dep.js": [
                    "dep",
                    "./extra-app-file.js"
                  ]
                }
              }
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 1 packages:");

    expect(await globby("*.zip")).to.eql([
      "one.zip"
    ]);
    expect(zipContents("one.zip")).to.eql([
      "node_modules/another-dep/index.js",
      "node_modules/another-dep/package.json",
      "node_modules/dep/index.js",
      "node_modules/dep/package.json",
      "src/one.js",
      "src/one/dep.js",
      "src/one/extra-app-file.js"
    ]);
  });

  // https://github.com/FormidableLabs/trace-pkg/issues/11
  it("packages projects with symlinks"); // TODO(11)
  it("packages monorepos with symlinks"); // TODO(11)
  it("packages monorepos with interproject dependencies"); // TODO(11)

  // https://github.com/FormidableLabs/trace-pkg/issues/3
  it("errors on collapsed files in zip bundle"); // TODO(3)
});
