import fs from "node:fs";
import process from "node:process";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const conf = JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json", "utf8"));
const cargo = fs.readFileSync("src-tauri/Cargo.toml", "utf8").match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const ref = String(process.env.GITHUB_REF_NAME || "");
const versions = new Set([pkg.version, conf.version, cargo]);
if (versions.size !== 1) throw new Error(`版本号不一致：package=${pkg.version}, tauri=${conf.version}, cargo=${cargo}`);
if (ref.startsWith("desktop-v")) {
  const tagged = ref.slice("desktop-v".length);
  if (tagged !== pkg.version) throw new Error(`标签${ref}与项目版本${pkg.version}不一致`);
}
console.log(`发布版本校验通过：${pkg.version}${ref ? ` · ${ref}` : ""}`);
