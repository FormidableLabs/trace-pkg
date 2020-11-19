"use strict";

const { normalize } = require("path");

const { getPackageNameFromPath } = require("../../../lib/util/package");

describe("lib/util/package", () => {
  describe("#getPackageNameFromPath", () => {
    it("handles base cases", async () => {
      expect(getPackageNameFromPath()).to.eql(null);
      expect(getPackageNameFromPath("")).to.eql(null);
      expect(getPackageNameFromPath(process.cwd())).to.eql(null);
    });

    it("handles application source paths", () => {
      expect(getPackageNameFromPath("./src/lib/foo.js")).to.eql(null);
      expect(getPackageNameFromPath("/ABS/PATH/src/lib/foo.js")).to.eql(null);
    });

    it("handles normal package paths", () => {
      expect(getPackageNameFromPath("./node_modules/foo/index.js")).to.eql({
        name: "foo",
        file: normalize("foo/index.js")
      });

      expect(getPackageNameFromPath(
        "/ABS/PATH/node_modules/one/node_modules/two/more/index.js"
      )).to.eql({
        name: "two",
        file: normalize("two/more/index.js")
      });

      expect(getPackageNameFromPath(
        "D:\\a\\WIN\\PATH\\node_modules\\three\\more\\index.js"
      )).to.eql({
        name: "three",
        file: normalize("three/more/index.js")
      });
    });

    it("handles scoped package paths", () => {
      expect(getPackageNameFromPath("./node_modules/@scope")).to.eql(null);

      expect(getPackageNameFromPath("./node_modules/@scope/foo/index.js")).to.eql({
        name: "@scope/foo",
        file: normalize("@scope/foo/index.js")
      });

      expect(getPackageNameFromPath(
        "/PATH/node_modules/one/node_modules/@scope/two/more/index.js"
      )).to.eql({
        name: "@scope/two",
        file: normalize("@scope/two/more/index.js")
      });


      expect(getPackageNameFromPath(
        "D:\\a\\WIN\\PATH\\node_modules\\@scope\\three\\more\\index.js"
      )).to.eql({
        name: "@scope/three",
        file: normalize("@scope/three/more/index.js")
      });

      expect(getPackageNameFromPath(
        "/PATH/node_modules/@scope/one/node_modules/four/more/index.js"
      )).to.eql({
        name: "four",
        file: normalize("four/more/index.js")
      });
    });
  });
});
