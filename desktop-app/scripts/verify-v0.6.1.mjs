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
expect(pkg.version === '0.6.1', 'package.json 版本不是 0.6.1');
expect(tauri.version === '0.6.1', 'tauri.conf.json 版本不是 0.6.1');
expect(version.semver === '0.6.1' && version.app_version === 'v006', 'VERSION.json 未同步 v006 / 0.6.1');
expect(/version = "0\.6\.1"/.test(read('src-tauri/Cargo.toml')), 'Cargo.toml 版本不是 0.6.1');
expect(html.includes('DESKTOP v006 · 0.6.1'), '界面版本标识不是 DESKTOP v006 · 0.6.1');
expect(app.includes('v061OpenRelationCard'), '缺少点击关系线说明卡');
expect(app.includes('v061RelationHit'), '缺少扩展关系线命中区域');
expect(app.includes('v061RectEdgePoint'), '缺少对象卡片边缘出线');
expect(app.includes('v061CurveControl'), '缺少关系线避让控制');
expect(app.includes('v061SetupHelpTips'), '缺少按钮延迟说明');
expect(app.includes('v061InjectMoreMenu'), '缺少更多工具菜单');
expect(app.includes('v061InjectLegendToggle'), '缺少关系图例折叠');
expect(css.includes('.v061-relation-card'), '缺少关系说明卡样式');
expect(css.includes('.v061-help-tooltip'), '缺少按钮说明样式');
expect(css.includes('.v061-more-menu'), '缺少更多菜单样式');
expect(app.includes('Math.min(1.85,Math.max(.82,size/BASE_CELL_PX))'), '地图文字缩放上限未生效');
if (errors.length) {
  console.error('v0.6.1 专项校验失败：');
  errors.forEach(e => console.error(`- ${e}`));
  process.exit(1);
}
console.log('v0.6.1专项校验：通过（关系线点击说明、宽命中、卡片边缘出线、基础避让、工具栏完整展示、延迟说明与图例折叠）。');
