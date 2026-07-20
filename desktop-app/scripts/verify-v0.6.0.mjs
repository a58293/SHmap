import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const version = JSON.parse(read('VERSION.json'));
const app = read('public/app/app.js');
const css = read('public/app/styles.css');
const html = read('index.html');

const errors = [];
const expect = (ok, msg) => { if (!ok) errors.push(msg); };
expect(pkg.version === '0.6.0', 'package.json 版本不是 0.6.0');
expect(tauri.version === '0.6.0', 'tauri.conf.json 版本不是 0.6.0');
expect(version.semver === '0.6.0' && version.app_version === 'v006', 'VERSION.json 未同步 v006 / 0.6.0');
expect(/version = "0\.6\.0"/.test(read('src-tauri/Cargo.toml')), 'Cargo.toml 版本不是 0.6.0');
expect(html.includes('DESKTOP v006'), '界面版本标识不是 DESKTOP v006');
expect(app.includes('relationDisplayMode'), '缺少关系精简/完整模式状态');
expect(app.includes('v060RelationSector'), '缺少同方向关系分组');
expect(app.includes('offscreenGroup'), '缺少屏外关系聚合');
expect(app.includes('v060InjectImageManager'), '缺少对象图片管理');
expect(read('src-tauri/src/lib.rs').includes('save_object_image'), '缺少桌面图片持久化命令');
expect(read('src/desktop-bootstrap.js').includes('convertFileSrc'), '缺少本地图片资源URL转换');
expect(app.includes('v060DeleteImpact'), '缺少删除影响检查');
expect(css.includes('.v060-relation-display'), '缺少 v0.6.0 关系网络样式');
expect(css.includes('.v060-object-focus'), '缺少对象聚焦样式');
if (errors.length) {
  console.error('v0.6.0 专项校验失败：');
  errors.forEach(e => console.error(`- ${e}`));
  process.exit(1);
}
console.log('v0.6.0专项校验：通过（关系精简/完整、同向合流、屏外聚合、对象聚焦、图片管理与删除影响检查）。');
