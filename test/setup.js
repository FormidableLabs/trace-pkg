"use strict";

const { expect, use } = require("chai");
const chaiAsPromised = require("chai-as-promised");
const sinonChai = require("sinon-chai");

use(chaiAsPromised);
use(sinonChai);

global.expect = expect;
