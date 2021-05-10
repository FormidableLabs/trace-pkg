"use strict";

const path = require("path");

const mock = require("mock-fs");
const sinon = require("sinon");
const globby = require("globby");

const createPackage = require("../../../lib/actions/package").package;
const { setLoggingOptions } = require("../../../lib/log");
const { zipContents } = require("../../util/file");

describe("lib/actions/package", () => {
  let sandbox;
  let logStub;

  beforeEach(() => {
    setLoggingOptions({ silent: false });
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

  it("handles special characters in file names", async () => {
    mock({
      src: {
        "[...id].js": "module.exports = 'dots and brackets in file name';",
        "...id.js": "module.exports = 'just dots in file name';",
        "[id].js": "module.exports = 'just brackets in file name';"
      }
    });

    await createPackage({
      opts: {
        config: {
          packages: {
            "one.zip": {
              trace: [
                "src/**/*.js"
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
      "src/...id.js",
      "src/[...id].js",
      "src/[id].js"
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

  it("traces source maps", async () => {
    mock({
      src: {
        "one.js": `
          module.exports = require('./one/dep');

          //# sourceMappingURL=one.js.map
        `,
        "one.js.map": "{\"not\":\"real\"}",
        one: {
          "dep.js": `
            require(process.env.DYNAMIC_ONE);

            module.exports = "dep";

            //# sourceMappingURL=../one/dep.js.map
          `,
          "dep.js.map": "{\"not\":\"real\"}",
          "extra-app-file.js": "module.exports = 'extra-app-file';"
        },
        two: {
          "index.js": "module.exports = require('./dep2');",
          "dep2.js": `
            require(process.env.DYNAMIC_TWO);

            module.exports = "dep";

            //# sourceMappingURL=not/found/on/disk.js.map
          `
        }
      },
      node_modules: {
        dep: {
          "package.json": JSON.stringify({
            main: "index.js"
          }),
          "index.js": `
            require(process.env.DYNAMIC_ANOTHER_DEP);

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
            includeSourceMaps: true,
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
              include: [
                // Directly include the map file to fully test out our
                // cached file stats functionality.
                "src/one/dep.js.map"
              ],
              dynamic: {
                resolutions: {
                  "./src/one/dep.js": [
                    "dep",
                    "./extra-app-file.js"
                  ]
                }
              }
            },
            two: {
              // Different CWD, so dynamic.resolutions are relative to that.
              cwd: "./src/two",
              trace: [
                "index.js"
              ],
              dynamic: {
                resolutions: {
                  "./dep2.js": [
                    "dep"
                  ]
                }
              }
            }
          }
        }
      }
    });

    expect(logStub)
      .to.have.been.calledWithMatch("Created 2 packages:").and
      .to.have.been.calledWithMatch("WARN", "Missing source map files in two:");

    expect(await globby("{,src/two/}*.zip")).to.eql([
      "one.zip",
      "src/two/two.zip"
    ]);
    expect(zipContents("one.zip")).to.eql([
      "node_modules/another-dep/index.js",
      "node_modules/another-dep/package.json",
      "node_modules/dep/index.js",
      "node_modules/dep/package.json",
      "src/one.js",
      "src/one.js.map",
      "src/one/dep.js",
      "src/one/dep.js.map",
      "src/one/extra-app-file.js"
    ]);
    expect(zipContents("src/two/two.zip")).to.eql([
      "node_modules/another-dep/index.js",
      "node_modules/another-dep/package.json",
      "node_modules/dep/index.js",
      "node_modules/dep/package.json",
      "dep2.js",
      "index.js"
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
            require('allowed-miss-from-app-sources');

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
              "./src/one/dep.js": [
                "allowed-miss-from-app-sources"
              ],
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
        },
        two: {
          "index.js": "module.exports = require('./dep2');",
          "dep2.js": `
            require(process.env.DYNAMIC_TWO);
            require("missing-but-allowed-from-app-sources");

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
            require(process.env.DYNAMIC_ANOTHER_DEP);

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
            },
            two: {
              // Different CWD, so dynamic.resolutions are relative to that.
              cwd: "./src/two",
              trace: [
                "index.js"
              ],
              allowMissing: {
                // This tests different CWD for allowMissing.
                "./dep2.js": [
                  "missing-but-allowed-from-app-sources"
                ]
              },
              dynamic: {
                resolutions: {
                  "./dep2.js": [
                    "dep"
                  ]
                }
              }
            }
          }
        }
      }
    });

    expect(logStub).to.have.been.calledWithMatch("Created 2 packages:");

    expect(await globby("{,src/two/}*.zip")).to.eql([
      "one.zip",
      "src/two/two.zip"
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
    expect(zipContents("src/two/two.zip")).to.eql([
      "node_modules/another-dep/index.js",
      "node_modules/another-dep/package.json",
      "node_modules/dep/index.js",
      "node_modules/dep/package.json",
      "dep2.js",
      "index.js"
    ]);
  });

  it("displays dynamic misses in report", async () => {
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
            require(process.env.DYNAMIC);

            module.exports = "dep";
          `
        }
      }
    });

    await createPackage({
      opts: {
        report: true,
        dryRun: true,
        config: {
          packages: {
            "one.zip": {
              trace: [
                "src/one.js"
              ]
            }
          }
        }
      }
    });

    const indexPath = path.normalize(path.resolve("node_modules/dep/index.js"));

    // Log output
    expect(logStub)
      .to.have.been.calledWithMatch("WARN", "Dynamic misses in one.zip:").and
      .to.have.been.calledWithMatch(
        "WARN",
        `${indexPath}\n  [2:12]: require(process.env.DYNAMIC)`
      );

    // Report output
    expect(logStub).to.have.been.calledWithMatch(`
      missed:
        ${indexPath}:
          - "[2:12]: require(process.env.DYNAMIC)"
    `.trim().replace(/^ {2}/gm, ""));
  });

  it("errors on unresolved dynamic misses", async () => {
    const errStub = sandbox.stub(console, "error");

    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": `
            require(process.env.DYNAMIC_ONE);

            module.exports = "dep";
          `,
          "extra-app-file.js": "module.exports = 'extra-app-file';"
        },
        two: {
          "index.js": "module.exports = require('./dep2');",
          "dep2.js": `
            require(process.env.DYNAMIC_TWO);

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
            require(process.env.DYNAMIC_ANOTHER_DEP);

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

    await expect(createPackage({
      opts: {
        config: {
          options: {
            dynamic: {
              bail: true
            }
          },
          packages: {
            "one.zip": {
              trace: [
                "src/one.js"
              ]
            },
            two: {
              // Different CWD, so dynamic.resolutions are relative to that.
              cwd: "./src/two",
              trace: [
                "index.js"
              ],
              dynamic: {
                bail: true,
                resolutions: {
                  "./dep2.js": [
                    "dep"
                  ],
                  "dep/index.js": [
                    "another-dep"
                  ]
                }
              }
            }
          }
        }
      }
    })).to.eventually.be.rejectedWith("Unresolved dynamic misses");

    expect(errStub).to.be.calledWithMatch("ERROR", "Unresolved dynamic misses in one.zip: [");
  });

  it("allows unresolved dynamic misses with package override of bail", async () => {
    mock({
      src: {
        "one.js": "module.exports = require('./one/dep');",
        one: {
          "dep.js": `
            require(process.env.DYNAMIC_ONE);

            module.exports = "dep";
          `,
          "extra-app-file.js": "module.exports = 'extra-app-file';"
        },
        two: {
          "index.js": "module.exports = require('./dep2');",
          "dep2.js": `
            require(process.env.DYNAMIC_TWO);

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
            require(process.env.DYNAMIC_ANOTHER_DEP);

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
              bail: true,
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
            },
            two: {
              // Different CWD, so dynamic.resolutions are relative to that.
              cwd: "./src/two",
              trace: [
                "index.js"
              ],
              dynamic: {
                // Allow unresolved misses.
                bail: false
              }
            }
          }
        }
      }
    });

    expect(logStub)
      .to.have.been.calledWithMatch("Created 2 packages:").and
      .to.have.been.calledWithMatch("WARN", "Dynamic misses in two:");

    expect(await globby("{,src/two/}*.zip")).to.eql([
      "one.zip",
      "src/two/two.zip"
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
    expect(zipContents("src/two/two.zip")).to.eql([
      "dep2.js",
      "index.js"
    ]);
  });

  it("errors on collapsed files in zip bundle", async () => {
    const errStub = sandbox.stub(console, "error");

    mock({
      "a-file.js": `
        module.exports = "a file (at project root)";
      `,
      packages: {
        one: {
          "index.js": `
            // Root level dep import.
            require("root-dep");

            // Application sources conflicts.
            require("../../a-file"); // Root
            require("./a-file"); // In packages/one

            // Transitive nested dep import.
            module.exports = require("./lib/nested");
          `,
          "a-file.js": `
            module.exports = "a file (in packages/one)";
          `,
          lib: {
            "nested.js": `
              module.exports = require("dep");
            `
          },
          node_modules: {
            dep: {
              "package.json": JSON.stringify({
                main: "index.js",
                version: "2.0.0"
              }),
              "index.js": `
                module.exports = "dep";
              `
            }
          }
        }
      },
      node_modules: {
        dep: {
          "package.json": JSON.stringify({
            main: "index.js",
            version: "1.0.0"
          }),
          "index.js": `
            module.exports = "dep";
          `
        },
        "root-dep": {
          "package.json": JSON.stringify({
            main: "index.js",
            version: "1.0.0"
          }),
          "index.js": `
            // Forces root-level dep package.
            module.exports = require("dep");
          `
        }
      }
    });

    await expect(createPackage({
      opts: {
        config: {
          packages: {
            one: {
              cwd: "packages/one",
              trace: [
                "index.js"
              ]
            }
          }
        }
      }
    })).to.eventually.be.rejectedWith("Collapsed file conflicts");

    expect(logStub)
      .to.be.calledWithMatch(
        "WARN",
        "Collapsed sources in one (1 conflicts, 2 files): a-file.js"
      ).and
      .to.be.calledWithMatch(
        "WARN",
        "Collapsed dependencies in one (1 packages, 2 conflicts, 4 files): dep"
      );

    expect(errStub).to.be.calledWithMatch(
      "ERROR",
      "Collapsed file conflicts in one: (3 total conflicts)"
    );
  });

  it("has no collapsed files in zip bundle from root", async () => {
    mock({
      "a-file.js": `
        module.exports = "a file (at project root)";
      `,
      packages: {
        one: {
          "index.js": `
            // Root level dep import.
            require("root-dep");

            // Application sources conflicts.
            require("../../a-file"); // Root
            require("./a-file"); // In packages/one

            // Transitive nested dep import.
            module.exports = require("./lib/nested");
          `,
          "a-file.js": `
            module.exports = "a file (in packages/one)";
          `,
          lib: {
            "nested.js": `
              module.exports = require("dep");
            `
          },
          node_modules: {
            dep: {
              "package.json": JSON.stringify({
                main: "index.js",
                version: "2.0.0"
              }),
              "index.js": `
                module.exports = "dep";
              `
            }
          }
        }
      },
      node_modules: {
        dep: {
          "package.json": JSON.stringify({
            main: "index.js",
            version: "1.0.0"
          }),
          "index.js": `
            module.exports = "dep";
          `
        },
        "root-dep": {
          "package.json": JSON.stringify({
            main: "index.js",
            version: "1.0.0"
          }),
          "index.js": `
            // Forces root-level dep package.
            module.exports = require("dep");
          `
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          packages: {
            one: {
              trace: [
                "packages/one/index.js"
              ]
            }
          }
        }
      }
    });


    expect(logStub)
      .to.have.been.calledWithMatch("Created 1 packages:");

    expect(await globby("**/*.zip")).to.eql([
      "one.zip"
    ]);
    expect(zipContents("one.zip")).to.eql([
      "a-file.js",
      "node_modules/dep/index.js",
      "node_modules/dep/package.json",
      "node_modules/root-dep/index.js",
      "node_modules/root-dep/package.json",
      "packages/one/a-file.js",
      "packages/one/index.js",
      "packages/one/lib/nested.js",
      "packages/one/node_modules/dep/index.js",
      "packages/one/node_modules/dep/package.json"
    ]);
  });

  it("warns on collapsed files in zip bundle with bail=false", async () => {
    mock({
      "a-file.js": `
        module.exports = "a file (at project root)";
      `,
      packages: {
        one: {
          "index.js": `
            // Root level dep import.
            require("root-dep");

            // Application sources conflicts.
            require("../../a-file"); // Root
            require("./a-file"); // In packages/one

            // Transitive nested dep import.
            module.exports = require("./lib/nested");
          `,
          "a-file.js": `
            module.exports = "a file (in packages/one)";
          `,
          lib: {
            "nested.js": `
              module.exports = require("@scope/dep");
            `
          },
          node_modules: {
            "@scope": {
              dep: {
                "package.json": JSON.stringify({
                  main: "index.js",
                  version: "2.0.0"
                }),
                "index.js": `
                  module.exports = "dep";
                `
              }
            }
          }
        }
      },
      node_modules: {
        "@scope": {
          dep: {
            "package.json": JSON.stringify({
              main: "index.js",
              version: "1.0.0"
            }),
            "index.js": `
              module.exports = "dep";
            `
          }
        },
        "root-dep": {
          "package.json": JSON.stringify({
            main: "index.js",
            version: "1.0.0"
          }),
          "index.js": `
            // Forces root-level dep package.
            module.exports = require("@scope/dep");
          `
        }
      }
    });

    await createPackage({
      opts: {
        config: {
          options: {
            collapsed: {
              bail: false
            }
          },
          packages: {
            one: {
              cwd: "packages/one",
              trace: [
                "index.js"
              ]
            }
          }
        }
      }
    });

    expect(logStub)
      .to.have.been.calledWithMatch("Created 1 packages:").and
      .to.be.calledWithMatch(
        "WARN",
        "Collapsed sources in one (1 conflicts, 2 files): a-file.js"
      ).and
      .to.be.calledWithMatch(
        "WARN",
        "Collapsed dependencies in one (1 packages, 2 conflicts, 4 files): @scope/dep"
      );

    expect(await globby("**/*.zip")).to.eql([
      "packages/one/one.zip"
    ]);
    expect(zipContents("packages/one/one.zip")).to.eql([
      // NOTE: These 3 files are collapsed and overwritten on expansion.
      "a-file.js",
      "node_modules/@scope/dep/index.js",
      "node_modules/@scope/dep/package.json",

      // Unique files.
      "node_modules/root-dep/index.js",
      "node_modules/root-dep/package.json",
      "a-file.js",
      "index.js",
      "lib/nested.js",
      "node_modules/@scope/dep/index.js",
      "node_modules/@scope/dep/package.json"
    ]);
  });

  // https://github.com/FormidableLabs/trace-pkg/issues/11
  it("packages projects with symlinks"); // TODO(11)
  it("packages monorepos with symlinks"); // TODO(11)
  it("packages monorepos with interproject dependencies"); // TODO(11)
});
