"use strict";

const os = require("os");
const path = require("path");

const execa = require("execa");
const fs = require("fs-extra");
const uuid = require("uuid");
const globby = require("globby");

const { zipContents } = require("../util/file");

const TMP = os.tmpdir();
const CLI = path.resolve(__dirname, "../../bin/trace-pkg.js");
const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

describe("e2e/trace-pkg", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(TMP, "trace-pkg", uuid.v4());
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.remove(tmpDir);
    }
  });

  describe("package", () => {
    it("performs concurrent bundles", async () => {
      const cwd = path.join(tmpDir, "simple");
      await fs.copy(path.join(FIXTURES_DIR, "simple"), cwd);

      const { stdout, stderr } = await execa(
        "node",
        [CLI, "-c", "trace-pkg.yml", "--concurrency=0"],
        { cwd }
      );

      expect(stdout).to.contain(`
        Created 3 packages:
        - one: one.zip (1 files)
        - two: two.zip (3 files)
        - three: ../../three.zip (1 files)
      `.trim().replace(/^ {8}/gm, ""));

      expect(stderr).to.equal("");

      expect(await globby("*.zip", { cwd })).to.eql([
        "one.zip",
        "three.zip",
        "two.zip"
      ]);
      expect(zipContents("one.zip", { cwd })).to.eql([
        "src/one/index.js"
      ]);
      expect(zipContents("two.zip", { cwd })).to.eql([
        "src/two/dep.js",
        "src/two/index.js",
        "src/two/package.json"
      ]);
      expect(zipContents("three.zip", { cwd })).to.eql([
        "index.js"
      ]);
    });

    it("handles errors from worker bundle process", async () => {
      const cwd = path.join(tmpDir, "error");
      await fs.copy(path.join(FIXTURES_DIR, "error"), cwd);

      let err;
      await execa(
        "node",
        [CLI, "-c", "trace-pkg.yml", "--concurrency=0"],
        { cwd }
      ).catch((e) => { err = e; });

      expect(err).to.be.ok;
      expect(err.stdout).to.equal("");
      expect(err.stderr).to.match(
        /Error: Encountered resolution error in .* for \.\/does-not-exist\.js/
      );
    });
  });
});
