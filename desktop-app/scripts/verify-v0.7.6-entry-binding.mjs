import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const appPath = path.join(root, 'public', 'app', 'app.js');
const versionPath = path.join(root, 'VERSION.json');
const app = fs.readFileSync(appPath, 'utf8');
const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

assert.equal(version.object_count, 617, '公开版本元数据应保持617条历史资料记录');
assert.ok(!fs.existsSync(path.join(root,'public','app','data.js')), '正式地图已私有化，public/app/data.js 不得恢复');

for (const token of [
  '九段式地块补充语义：文件名匹配唯一已有地块',
  'linkReason:"tile-content"',
  'linkedObjectId:""',
  'if(entry?.linkReason==="tile-content")return null',
  'if(normalizedItem.linkReason==="tile-content")',
  '地块内部资料',
  '第06节分类条目直接作为该地块内部资料显示，不需要匹配独立地图对象。',
]) {
  assert.ok(app.includes(token), `缺少地块博物志内部条目语义：${token}`);
}

const parseStart = app.indexOf('function parseNineSectionDocument(doc)');
const parseEnd = app.indexOf('function parseMarkdown(text)', parseStart);
assert.ok(parseStart >= 0 && parseEnd > parseStart, '应能定位九段式解析函数');
const parser = app.slice(parseStart, parseEnd);
assert.ok(!parser.includes('resolveDossierEntryLink(e.name'), '第06节条目不得再尝试匹配独立地图对象');
assert.ok(!parser.includes('只识别到名称，没有识别到'), '名称本身应是有效的地块内部条目，不得报详情字段缺失');
assert.ok(!parser.includes('dossierUnlinkedEntryMessage(e,linked)'), '地块内部条目不得产生未绑定对象警告');

const visibleStart = app.indexOf('function museumObjectHasVisibleDetails(o)');
const visibleEnd = app.indexOf('function briefMuseumObjectHTML', visibleStart);
const visibleBlock = app.slice(visibleStart, visibleEnd);
assert.ok(visibleBlock.includes('return !!o?.name'), '只有名称的地块内部条目也必须显示');

console.log('v0.7.6 九段式地块补充校验通过：数据计数改由 VERSION.json 校验，不再读取已私有化 data.js。');
