"use strict";

const path = require("path");

const { normalizeResolutions } = require("../../../lib/trace/resolutions");

describe("lib/trace/resolutions", () => {
  describe("#normalizeResolutions", () => {
    it("handles base cases", () => {
      expect(normalizeResolutions()).to.eql({});
      expect(normalizeResolutions({ resolutions: {} })).to.eql({});
      expect(normalizeResolutions({ cwd: "foo/bar", resolutions: {} })).to.eql({});
    });

    it("converts application sources to full paths", () => {
      // Posix keys
      expect(normalizeResolutions({ resolutions: {
        "./src/index.js": ["foo"],
        "./src/two.js": null
      } })).to.eql({
        [path.resolve(path.normalize("./src/index.js"))]: ["foo"],
        [path.resolve(path.normalize("./src/two.js"))]: []
      });

      // Native keys
      expect(normalizeResolutions({ resolutions: {
        [[".", path.normalize("src/index.js")].join(path.sep)]: ["foo"],
        [[".", path.normalize("src/two.js")].join(path.sep)]: null
      } })).to.eql({
        [path.resolve(path.normalize("./src/index.js"))]: ["foo"],
        [path.resolve(path.normalize("./src/two.js"))]: []
      });
    });

    it("leaves packages with relative paths", () => {
      // Posix keys
      expect(normalizeResolutions({ resolutions: {
        "my-pkg/index.js": ["foo"],
        "@scope/my-pkg/src/two.js": null
      } })).to.eql({
        "my-pkg/index.js": ["foo"],
        "@scope/my-pkg/src/two.js": []
      });

      // Native keys
      expect(normalizeResolutions({ resolutions: {
        [["my-pkg", path.normalize("src/index.js")].join(path.sep)]: ["foo"],
        [["@scope/my-pkg", path.normalize("src/two.js")].join(path.sep)]: null
      } })).to.eql({
        [["my-pkg", path.normalize("src/index.js")].join(path.sep)]: ["foo"],
        [["@scope/my-pkg", path.normalize("src/two.js")].join(path.sep)]: []
      });
    });
  });
});
