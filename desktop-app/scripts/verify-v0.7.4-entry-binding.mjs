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
assert.ok(objects.some(o => o.name === '九嶷山' && /^山/.test(String(o.type || ''))), '客户端应包含山地对象“九嶷山”');
const emperorShunNamed = objects.filter(o => String(o.name || '').includes('帝舜'));
assert.ok(emperorShunNamed.length >= 1, '应存在帝舜相关地点对象');
assert.ok(emperorShunNamed.every(o => /台|迹|区域/.test(String(o.type || ''))), '现有帝舜相关对象应为地点／遗迹，而非独立人物对象');

for (const token of [
  'function dossierAliasTargetNames(name)',
  '"九疑山":["九嶷山"]',
  'function dossierObjectAliasNames(object)',
  'function dossierUnlinkedEntryMessage(entry,linked)',
  '"category-mismatch"',
  '地点、祭台或遗迹不会被误绑定为人物',
  'function resolvedDossierEntryObject(entry,owner)',
  'resolvedDossierEntryObject(e,main)',
]) {
  assert.ok(app.includes(token), `缺少条目绑定修正：${token}`);
}

assert.ok(!app.includes('"九疑山":"九嶷山/九疑山"'), '不得保留无法命中真实对象名的旧别名');
assert.ok(!app.includes('（存在多个可能对象）'), '不得继续使用不区分类型的歧义提示');

console.log('v0.7.4 条目别名与类型安全绑定校验通过：九疑山→九嶷山；帝舜台不误绑为人物。');
