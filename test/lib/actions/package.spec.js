"use strict";

const mock = require("mock-fs");
const sinon = require("sinon");
const globby = require("globby");
const AdmZip = require("adm-zip");

const createPackage = require("../../../lib/actions/package").package;

const zipContents = (zipPath) => {
  const zip = new AdmZip(zipPath);
  return zip.getEntries().map(({ entryName }) => entryName);
};

describe("lib/actions/package", () => {
  let sandbox;

  beforeEach(() => {
    mock({});
    sandbox = sinon.createSandbox();
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

  // TODO
  // - [ ] `KEY`
  // - [ ] `KEY.zip`
  // - [ ] `output: PATH/TO/NAME.zip`
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

  it("packages projects with symlinks"); // TODO
  it("packages monorepos"); // TODO
  it("packages monorepos with symlinks"); // TODO

  it("errors on collapsed files in zip bundle"); // TODO

  it("TODO: IMPLEMENT SUITE"); // TODO
});
