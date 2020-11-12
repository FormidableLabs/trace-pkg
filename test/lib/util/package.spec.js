"use strict";

const { getPackage } = require("../../../lib/util/package");

// TODO: Probably need to "Posix" these paths for asserts.

describe("lib/util/package", () => {
  describe("#getPackage", () => {
    it("handles base cases", async () => {
      expect(getPackage()).to.eql(null);
      expect(getPackage("")).to.eql(null);
      expect(getPackage(process.cwd())).to.eql(null);
    });

    it("handles application source paths", () => {
      expect(getPackage("./src/lib/foo.js")).to.eql(null);
      expect(getPackage("/ABS/PATH/src/lib/foo.js")).to.eql(null);
    });

    it("handles normal package paths", () => {
      expect(getPackage("./node_modules/foo/index.js")).to.eql({
        name: "foo",
        file: "foo/index.js"
      });

      expect(getPackage("/ABS/PATH/node_modules/one/node_modules/two/more/index.js")).to.eql({
        name: "two",
        file: "two/more/index.js"
      });
    });

    it("handles scoped package paths", () => {
      expect(getPackage("./node_modules/@scope")).to.eql(null);

      expect(getPackage("./node_modules/@scope/foo/index.js")).to.eql({
        name: "@scope/foo",
        file: "@scope/foo/index.js"
      });

      expect(getPackage("/PATH/node_modules/one/node_modules/@scope/two/more/index.js")).to.eql({
        name: "@scope/two",
        file: "@scope/two/more/index.js"
      });

      expect(getPackage("/PATH/node_modules/@scope/one/node_modules/two/more/index.js")).to.eql({
        name: "two",
        file: "two/more/index.js"
      });
    });
  });
});
