import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));
const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
const version = JSON.parse(read("VERSION.json"));
const html = read("index.html");
const app = read("public/app/app.js");
const css = read("public/app/styles.css");
const fixture = read("scripts/fixture-苍梧之丘-九段式.md");

function stripInline(value) {
  return String(value || "").trim().replace(/^[-*+]\s+/, "").replace(/(?:\*\*|__)/g, "").replace(/`/g, "").trim();
}
function trimHeading(line) {
  let value = String(line || "").trim();
  value = value.replace(/^>\s*/, "").replace(/^#{1,6}\s*/, "");
  value = value.replace(/^(?:\*\*|__)\s*/, "").replace(/\s*(?:\*\*|__)\s*$/, "");
  return value.trim();
}
function sectionHeader(line) {
  const aliases = {
    1: ["区域定位", "地理定位", "位置定位"],
    2: ["一句话概要", "一句话概述", "概要", "一句话摘要"],
    3: ["本地标签", "地点标签", "标签"],
    4: ["地块属性", "地点属性", "对象属性"],
    5: ["数据关系", "关系数据", "对象关系"],
    6: ["分别整理以下六类", "分别整理以下七类", "分别整理以下类目", "分类整理以下六类", "分类整理以下七类", "分类整理以下类目", "分类整理", "分类条目", "六类整理", "七类整理", "详细整理", "这里有什么"],
    7: ["原文摘录", "原典摘录", "原文"],
    8: ["其他典故", "古注补充", "典故补充"],
    9: ["详细描述", "详细说明", "完整描述"],
  };
  const m = trimHeading(line).match(/^0?([1-9])\s*(?:[.．,，、:：\-—–]|[)）])?\s*(.*?)\s*$/);
  if (!m) return null;
  const number = Number(m[1]);
  const title = String(m[2] || "").replace(/[：:]\s*$/, "").replace(/\s+/g, "").trim();
  return (aliases[number] || []).some(alias => title === alias || title.startsWith(alias)) ? number : null;
}
function categoryHeader(line) {
  const value = trimHeading(line).replace(/[：:]\s*$/, "").replace(/[（(][^）)]*[）)]\s*$/, "").replace(/\s+/g, "");
  return {
    地貌: "地貌", 山水地貌: "地貌", 地形地貌: "地貌",
    水系: "水系", 水域: "水系", 河流湖泽: "水系",
    草木: "草木", 植物: "草木",
    鸟兽: "鸟兽", 动物: "鸟兽", 异兽: "鸟兽",
    金玉矿物: "金玉矿物", 矿物: "金玉矿物", 金玉: "金玉矿物",
    人群神祇: "人群神祇", 人群与神祇: "人群神祇", 神祇人群: "人群神祇",
    事件与遗迹: "事件遗迹", 事件遗迹: "事件遗迹", 事迹: "事件遗迹", 事件: "事件遗迹",
  }[value] || "";
}
function stripListPrefix(value) {
  return String(value || "").replace(/^\s*[-*+]\s*/, "").replace(/^\s*(?:[（(]\s*[1-9]\s*[）)]|[1-9]\s*(?:[，,、.．:：)）]))\s*/, "").trim();
}
function fieldLine(line) {
  const m = stripListPrefix(stripInline(line)).match(/^(与本地关系|核心特征|证据|功效|效用|用途|能力)\s*[：:]\s*(.*)\s*$/);
  if (!m) return null;
  return { label: m[1], value: stripInline(m[2]) };
}
function placeholder(name) {
  const key = String(name || "").normalize("NFKC").replace(/[\s，,。；;：:、\-—–]/g, "");
  return /^(?:原文)?(?:未载明确|未载|无明确记载|未明确记载|暂无明确记载|暂无相关记载|无相关记载|资料待补充|待补充)$/.test(key);
}
function parseFixture(text) {
  const sections = {};
  let current = 0;
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const hit = sectionHeader(line);
    if (hit) {
      if (hit > current && !sections[hit]) {
        current = hit;
        sections[current] = [];
      }
      continue;
    }
    if (current) sections[current].push(line);
  }
  const entries = [];
  let category = "";
  let entry = null;
  for (const line of sections[6] || []) {
    const cat = categoryHeader(line);
    if (cat) {
      category = cat;
      entry = null;
      continue;
    }
    if (!line.trim()) continue;
    const field = fieldLine(line);
    if (field && entry) {
      entry[field.label] = field.value;
      continue;
    }
    if (category && !/^#{1,6}\s/.test(line.trim())) {
      const name = stripInline(line).replace(/^\d+\s*[，,、.．]\s*/, "").trim();
      if (!name || placeholder(name) || /^(与本地关系|核心特征|证据|功效|效用|用途|能力)\s*[：:]/.test(name)) continue;
      entry = { category, name };
      entries.push(entry);
    }
  }
  return { sections, entries };
}

const parsed = parseFixture(fixture);
const fieldCount = parsed.entries.reduce((sum, entry) => sum + ["与本地关系", "核心特征", "证据", "功效"].filter(key => entry[key]).length, 0);
const byName = new Map(parsed.entries.map(entry => [`${entry.category}|${entry.name}`, entry]));

const checks = [
  ["package 版本", pkg.version === "0.7.6"],
  ["Tauri 版本", tauri.version === "0.7.6"],
  ["VERSION 版本", version.semver === "0.7.6" && version.app_version === "v007"],
  ["界面版本", html.includes("DESKTOP v007 · 0.7.6")],
  ["安全补充导入模式", html.includes('id="importPolicySelect"') && html.includes('value="supplement" selected') && app.includes('importPolicy:"supplement"')],
  ["通用父子地点层级", app.includes("function qualifiedChildLocationName") && app.includes("function applyChildLocationDossier") && app.includes('geometryMode:"non-spatial-child"')],
  ["九段式混合标题识别", app.includes("function matchNineSectionHeaderLine") && app.includes("一句话概述") && app.includes("分别整理以下六类")],
  ["七类、类目与详细整理标题兼容", app.includes("分别整理以下七类") && app.includes("分别整理以下类目") && app.includes("详细整理") && app.includes("title.startsWith(alias)")],
  ["审核指纹变化语义回退", app.includes('matchReason:"audit-snapshot-fallback"') && app.includes("名称、经篇和类型唯一定位") && app.includes("auditTargetChanged:true")],
  ["中西文标点兼容", app.includes("function stripNineListPrefix") && app.includes("[.．,，、:：") && app.includes("matchNineEntryFieldLine")],
  ["分类别名兼容", app.includes("function normalizeNineCategoryName") && app.includes('"山水地貌":"地貌"') && app.includes('"水域":"水系"')],
  ["占位条目不生成卡片", app.includes("function isNinePlaceholderEntryName") && app.includes("placeholderCategories")],
  ["详情字段导入前预览", app.includes("function dossierEntryAuditText") && app.includes("detailFieldCount") && app.includes("个详情字段")],
  ["旧空白字段可被补齐", app.includes("function isSupplementPlaceholderText") && app.includes("normalizedDossierCategoryLabel")],
  ["补充模式保护地图结构", app.includes("不会创建新对象") && app.includes("不生成新地块或地图坐标") && app.includes("坐标与几何保持不变")],
  ["仅显示有内容分类", app.includes("filter(cat=>cat.objects.length)") && app.includes('if(!total)return ""')],
  ["分类键正确归位", app.includes('keys=new Set(["terrain","plants","animals","minerals","people","events"])') && app.includes('"事件与遗迹":"events"')],
  ["条目正文直接展开", css.includes("博物志分类归位与条目详情直显修正") && css.includes("max-height:none") && css.includes("repeat(auto-fit,minmax(340px,1fr))")],
  ["苍梧样例九章完整", Object.keys(parsed.sections).length === 9],
  ["苍梧样例有效条目数", parsed.entries.length === 6],
  ["苍梧样例详情字段数", fieldCount === 18],
  ["苍梧之丘核心特征", byName.get("地貌|苍梧之丘")?.核心特征 === "丘渊并立，中有神山"],
  ["苍梧之渊水系特征", byName.get("水系|苍梧之渊")?.核心特征 === "深渊水体伴丘存"],
  ["帝舜关系字段", byName.get("人群神祇|帝舜")?.与本地关系 === "原文直载（葬）"],
  ["舜葬遗迹证据字段", byName.get("事件遗迹|舜葬遗迹")?.证据 === "出自《大荒南经》"],
  ["基础数据保持", version.object_count === 617 && version.water_path_segments === 79 && version.water_arrow_cells === 118],
  ["关系线与画笔保留", app.includes("drawV029RelationOverlay") && app.includes("drawBrushTraceCanvas")],
];

let bad = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) bad = true;
}
if (bad) process.exit(1);
console.log(`v0.7.6 Markdown兼容专项校验通过：苍梧之丘样例识别 ${parsed.entries.length} 个有效条目、${fieldCount} 个详情字段。`);
