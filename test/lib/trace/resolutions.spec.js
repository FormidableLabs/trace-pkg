"use strict";

const path = require("path");

const { normalizeResolutions, resolveMisses } = require("../../../lib/trace/resolutions");

const addResolveMisses = ({ resolved = [], missed = {} } = {}) => ({
  resolved,
  missed
});

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

  describe("#resolveMisses", () => {
    it("handles base cases", () => {
      expect(resolveMisses()).to.eql(addResolveMisses());
      expect(resolveMisses({ resolutions: {} })).to.eql(addResolveMisses());
    });

    it("detects application sources resolutions", () => {
      expect(resolveMisses({
        resolutions: normalizeResolutions({
          resolutions: {
            "./src/one/index.js": []
          }
        }),
        misses: {
          [path.resolve(path.normalize("src/one/index.js"))]: [
            {
              src: "require(process.env.DYNAMIC_ONE)"
            }
          ],
          [path.resolve(path.normalize("src/two/index.js"))]: [
            {
              src: "require(process.env.DYNAMIC_TWO)"
            }
          ]
        }
      })).to.eql(addResolveMisses({
        resolved: [
          path.resolve(path.normalize("src/one/index.js"))
        ],
        missed: {
          [path.resolve(path.normalize("src/two/index.js"))]: [
            {
              src: "require(process.env.DYNAMIC_TWO)"
            }
          ]
        }
      }));
    });

    it("detects package resolutions", () => {
      const onePath = path.resolve(path.normalize("node_modules/one/index.js"));
      const twoPath = path.resolve(path.normalize(
        "node_modules/one/node_modules/@scope/two/index.js"
      ));
      const twoMissPath = path.resolve(path.normalize("node_modules/@scope/two/miss.js"));
      expect(resolveMisses({
        resolutions: normalizeResolutions({
          resolutions: {
            "one/index.js": [],
            "@scope/two/index.js": []
          }
        }),
        misses: {
          [onePath]: [
            {
              src: "require(process.env.DYNAMIC_ONE)"
            }
          ],
          [twoPath]: [
            {
              src: "require(process.env.DYNAMIC_TWO)"
            }
          ],
          [twoMissPath]: [
            {
              src: "require(process.env.DYNAMIC_TWO_MISS)"
            }
          ]
        }
      })).to.eql(addResolveMisses({
        resolved: [
          onePath,
          twoPath
        ],
        missed: {
          [twoMissPath]: [
            {
              src: "require(process.env.DYNAMIC_TWO_MISS)"
            }
          ]
        }
      }));
    });
  });
});
