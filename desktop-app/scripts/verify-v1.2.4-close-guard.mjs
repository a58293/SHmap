import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(path,"utf8");
const pkg=JSON.parse(read("package.json"));
const version=JSON.parse(read("VERSION.json"));
const boot=read("src/desktop-bootstrap.js");

assert.equal(pkg.version,"1.2.6");
assert.equal(version.semver,"1.2.6");
assert.ok(boot.includes("CLOSE_SAVE_TIMEOUT_MS = 3000"),"native close save timeout is missing");
assert.ok(boot.includes("nativeCloseInProgress"),"repeated close requests are not guarded");
assert.ok(boot.includes("if(!nativeStorageReady)return false"),"close can still wait forever before native storage is ready");
assert.ok(boot.includes("Date.now()>=deadline"),"workspace flush loop has no deadline");
assert.ok(boot.includes("if(timeoutMs>0)void pumpSave()"),"timed close still blocks directly on the native save promise");
assert.ok(boot.includes('invoke("exit_application")'),"native close does not request full application exit after the save attempt");
console.log("PASS v1.2.4 close watchdog retained by v1.2.6");
