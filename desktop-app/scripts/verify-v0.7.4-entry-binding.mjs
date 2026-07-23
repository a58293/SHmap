import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const appPath = path.join(root, 'public', 'app', 'app.js');
const dataPath = path.join(root, 'public', 'app', 'data.js');
const app = fs.readFileSync(appPath, 'utf8');
const dataSource = fs.readFileSync(dataPath, 'utf8');
const context = { window: {} };
vm.runInNewContext(dataSource, context, { filename: dataPath });
const objects = context.window.SHJ_INITIAL_DATA?.objects || [];

assert.equal(objects.length, 617, '对象数量应保持617');

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

console.log('v0.7.5 九段式地块补充校验通过：文件名匹配地块，第06节仅作为地块内部内容，不要求独立对象绑定。');
