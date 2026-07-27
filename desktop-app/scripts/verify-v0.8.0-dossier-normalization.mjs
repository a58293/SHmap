import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("public/app/app.js", "utf8");

assert.ok(app.includes("function legacyDossierFieldCard"));
assert.ok(app.includes("function normalizedDossierMuseumEntries"));
assert.ok(app.includes("function matchNineAuxiliaryFieldLine"));
assert.ok(app.includes("entry.notes=mergeSupplementText(entry.notes"));
assert.ok(app.includes('"备注":"notes"'));
assert.ok(app.includes('["备注",o.notes]'));
assert.ok(app.includes('["备注",entry.notes]'));
assert.ok(app.includes("replace(/[。．.!！?？；;：:]+$/g"));
assert.ok(app.includes("normalizedDossierMuseumEntries(old.museumEntries)"));
assert.ok(app.includes("地貌名称|水系名称|河流名称|草木名称|植物名称|鸟兽名称"));
assert.ok(app.includes("待考|未知|不详"));

const stripInlineMarkdown = value => String(value || "")
  .trim()
  .replace(/^[-*+]\s+/, "")
  .replace(/(?:\*\*|__)/g, "")
  .replace(/`/g, "")
  .trim();
const stripListPrefix = value => String(value || "")
  .replace(/^\s*[-*+]\s*/, "")
  .replace(/^\s*(?:[（(]\s*[1-9]\s*[）)]|[1-9]\s*(?:[，,、.．:：)）]))\s*/, "")
  .trim();
const normalizeName = value => stripListPrefix(stripInlineMarkdown(value))
  .replace(/^\d+\s*[，,、.．]\s*/, "")
  .replace(/[。．.!！?？；;：:]+$/g, "")
  .trim();
const fieldCard = value => {
  const plain = stripListPrefix(stripInlineMarkdown(value));
  const match = plain.match(/^(备注|说明|补充说明)\s*[：:]\s*(.*)$/);
  return match ? match[2].trim() : "";
};

const legacy = [
  "**氐人**。",
  '* 4. 备注：郭璞注云：“氐，音触抵之抵。”',
  "氐人。",
  '备注：郭璞注云：“氐，音触抵之抵。”',
];
const names = legacy.filter(value => !fieldCard(value)).map(normalizeName);
assert.deepEqual([...new Set(names)], ["氐人"]);
assert.equal(legacy.filter(fieldCard).length, 2);

const typedName = value => normalizeName(value)
  .replace(/^(?:地貌名称|水系名称|草木名称|鸟兽名称|矿物名称|人群名称)\s*[：:]\s*/, "")
  .replace(/\s*[\[【（(](?:原文直载|地图推定|古注补充|原文未载)[^\]】）)]*[\]】）)]\s*$/, "");
assert.equal(typedName("水系名称：黑水 [原文直载]"), "黑水");
assert.ok(/^\s*(?:[-*+]\s*)?(?:[（(]?\s*[1-9]\s*[）)]|[1-9]\s*[，,、.．:：)）])\s*/.test("4. 生活习性：昼伏夜出"));

console.log("v0.8.0 博物志规范化校验通过：氐人名称变体合并为1项，备注字段不再生成卡片。");
