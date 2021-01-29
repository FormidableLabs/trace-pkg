"use strict";

const path = require("path");

const { normalizeFileKeys } = require("../../../lib/util/path");

describe("lib/util/path", () => {
  describe("#normalizeFileKeys", () => {
    it("handles base cases", () => {
      expect(normalizeFileKeys()).to.eql({});
      expect(normalizeFileKeys({ map: {} })).to.eql({});
      expect(normalizeFileKeys({ cwd: "foo/bar", map: {} })).to.eql({});
    });

    it("converts application sources to full paths", () => {
      // Posix keys
      expect(normalizeFileKeys({ map: {
        "./src/index.js": ["foo"],
        "./src/two.js": null
      } })).to.eql({
        [path.resolve(path.normalize("./src/index.js"))]: ["foo"],
        [path.resolve(path.normalize("./src/two.js"))]: []
      });

      // Native keys
      expect(normalizeFileKeys({ map: {
        [[".", path.normalize("src/index.js")].join(path.sep)]: ["foo"],
        [[".", path.normalize("src/two.js")].join(path.sep)]: null
      } })).to.eql({
        [path.resolve(path.normalize("./src/index.js"))]: ["foo"],
        [path.resolve(path.normalize("./src/two.js"))]: []
      });
    });

    it("leaves packages with relative paths", () => {
      // Posix keys
      expect(normalizeFileKeys({ map: {
        "my-pkg/index.js": ["foo"],
        "@scope/my-pkg/src/two.js": null
      } })).to.eql({
        "my-pkg/index.js": ["foo"],
        "@scope/my-pkg/src/two.js": []
      });

      // Native keys
      expect(normalizeFileKeys({ map: {
        [["my-pkg", path.normalize("src/index.js")].join(path.sep)]: ["foo"],
        [["@scope/my-pkg", path.normalize("src/two.js")].join(path.sep)]: null
      } })).to.eql({
        [["my-pkg", path.normalize("src/index.js")].join(path.sep)]: ["foo"],
        [["@scope/my-pkg", path.normalize("src/two.js")].join(path.sep)]: []
      });
    });
  });
});
