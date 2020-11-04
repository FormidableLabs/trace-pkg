"use strict";

const mock = require("mock-fs");
const sinon = require("sinon");
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

  // TODO
  // - [ ] `options.cwd`
  // - [ ] `packages.KEY.cwd`
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
  it("outputs zip files to multiple different locations"); // TODO

  it("packages projects with symlinks"); // TODO
  it("packages monorepos"); // TODO
  it("packages monorepos with symlinks"); // TODO

  it("errors on collapsed files in zip bundle"); // TODO

  it("TODO: IMPLEMENT SUITE"); // TODO
});
