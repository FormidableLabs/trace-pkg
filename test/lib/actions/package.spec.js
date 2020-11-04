"use strict";

const mock = require("mock-fs");
const sinon = require("sinon");

const createPackage = require("../../../lib/actions/package").package;

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
  it("packages across multiple different working directories"); // TODO

  // TODO
  // - [ ] `KEY`
  // - [ ] `KEY.zip`
  // - [ ] `output: PATH/TO/NAME.zip`
  it("outputs zip files to multiple different locations"); // TODO

  it("packages projects with symlinks"); // TODO
  it("packages monorepos"); // TODO
  it("packages monorepos with symlinks"); // TODO

  it("TODO: IMPLEMENT SUITE"); // TODO
});
