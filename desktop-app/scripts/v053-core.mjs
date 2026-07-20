#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const VERSION = "0.5.3";
const EDITION = "v005";
const PATCH_NAME = "SHmap v0.5.3 区域概览、层级与线型对象修复";

const argv = process.argv.slice(2);
const flags = new Set(argv.filter(arg => arg.startsWith("--")));
const positional = argv.filter(arg => !arg.startsWith("--"));
const dryRun = flags.has("--dry-run");
const noVerify = flags.has("--no-verify");
const selfTest = flags.has("--self-test");

function info(message) { console.log(`[0.5.3] ${message}`); }
function warn(message) { console.warn(`[0.5.3 警告] ${message}`); }
function fail(message) { throw new Error(message); }
function exists(file) { return fs.existsSync(file); }
function read(file) { return fs.readFileSync(file, "utf8"); }
function normalizeEol(text, original) { return original.includes("\r\n") ? text.replace(/\r?\n/g, "\r\n") : text.replace(/\r\n/g, "\n"); }

function resolveRoots(input) {
  let candidate = path.resolve(input || process.cwd());
  const checks = [candidate, path.join(candidate, "desktop-app"), path.dirname(candidate)];
  for (const item of checks) {
    if (exists(path.join(item, "package.json")) && exists(path.join(item, "public", "app", "app.js"))) {
      const appRoot = item;
      const repoRoot = path.basename(appRoot).toLowerCase() === "desktop-app" ? path.dirname(appRoot) : appRoot;
      return { appRoot, repoRoot };
    }
  }
  fail(`没有找到 desktop-app。请把补丁放到 SHmap 仓库根目录，或把仓库路径作为参数传入。当前检查路径：${candidate}`);
}

function functionMarker(name) { return `function ${name}`; }

function replaceBetween(source, startMarker, endMarker, replacement, label = startMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`无法定位 ${label} 的起始标记：${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`无法定位 ${label} 的结束标记：${endMarker}`);
  return source.slice(0, start) + replacement.trim() + " " + source.slice(end);
}

function replaceFunction(source, name, nextName, replacement) {
  return replaceBetween(source, functionMarker(name), functionMarker(nextName), replacement, `函数 ${name}`);
}

function replaceOnce(source, search, replacement, label) {
  if (search instanceof RegExp) {
    if (!search.test(source)) fail(`无法定位 ${label}`);
    return source.replace(search, replacement);
  }
  const index = source.indexOf(search);
  if (index < 0) fail(`无法定位 ${label}`);
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

function parseAssignedJson(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) fail(`data.js 缺少标记：${marker}`);
  let start = markerIndex + marker.length;
  while (/\s/.test(source[start] || "")) start += 1;
  const opener = source[start];
  const closer = opener === "{" ? "}" : opener === "[" ? "]" : "";
  if (!closer) fail(`${marker} 后不是 JSON 对象或数组`);
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return { value: JSON.parse(source.slice(start, i + 1)), start, end: i + 1 };
      }
    }
  }
  fail(`${marker} 对应的 JSON 没有闭合`);
}

function replaceAssignedJson(source, marker, value) {
  const parsed = parseAssignedJson(source, marker);
  return source.slice(0, parsed.start) + JSON.stringify(value) + source.slice(parsed.end);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function extendBounds(bounds, item) {
  if (!item) return bounds;
  bounds.minX = Math.min(bounds.minX, finite(item.minX, Infinity));
  bounds.maxX = Math.max(bounds.maxX, finite(item.maxX, -Infinity));
  bounds.minY = Math.min(bounds.minY, finite(item.minY, Infinity));
  bounds.maxY = Math.max(bounds.maxY, finite(item.maxY, -Infinity));
  return bounds;
}

function freshBounds() {
  return { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
}

function validBounds(bounds) {
  return bounds && [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].every(Number.isFinite);
}

function paddedBounds(bounds, padding = 60) {
  if (!validBounds(bounds)) return { minX: -50, maxX: 50, minY: -50, maxY: 50 };
  const width = Math.max(0, bounds.maxX - bounds.minX);
  const height = Math.max(0, bounds.maxY - bounds.minY);
  const px = Math.max(padding, width * 0.04);
  const py = Math.max(padding, height * 0.04);
  return { minX: bounds.minX - px, maxX: bounds.maxX + px, minY: bounds.minY - py, maxY: bounds.maxY + py };
}

function objectBoundsForRegion(object) {
  const x = finite(object?.x);
  const y = finite(object?.y);
  const area = object?.area;
  if (!area || typeof area !== "object") return { minX: x, maxX: x, minY: y, maxY: y };
  if (area.shape === "circle") {
    const cx = finite(area.cx, x), cy = finite(area.cy, y), radius = Math.max(0, finite(area.radius));
    return { minX: cx - radius, maxX: cx + radius, minY: cy - radius, maxY: cy + radius };
  }
  if (area.shape === "polygon" && Array.isArray(area.points) && area.points.length) {
    const bounds = freshBounds();
    for (const point of area.points) {
      if (!Array.isArray(point) || point.length < 2) continue;
      extendBounds(bounds, { minX: finite(point[0]), maxX: finite(point[0]), minY: finite(point[1]), maxY: finite(point[1]) });
    }
    if (validBounds(bounds)) return bounds;
  }
  const west = Number(area.west), east = Number(area.east), south = Number(area.south), north = Number(area.north);
  if ([west, east, south, north].every(Number.isFinite)) {
    return { minX: Math.min(west, east), maxX: Math.max(west, east), minY: Math.min(south, north), maxY: Math.max(south, north) };
  }
  return { minX: x, maxX: x, minY: y, maxY: y };
}

function cleanRegionName(raw) {
  let name = String(raw || "")
    .replace(/[《》]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[—–-]+|[—–-]+$/g, "")
    .trim();
  const parts = name.split(/[、，,]+/).map(part => part.trim()).filter(Boolean);
  while (parts.length > 1 && /(?:模块|路径|分流|异文|校注|候选|项目|接口|走廊|主干|源段|代表段|拓扑|示意|排版)/.test(parts.at(-1))) parts.pop();
  name = parts.join("、")
    .replace(/(?:完整)?拓扑模块|连续拓扑模块|接口模块|外接模块|源模块|后续模块|分流层|异文层|校注层|候选层|项目层|代表段|路径示意$/g, "")
    .trim();
  return name;
}

function regionTokensStrict(object) {
  const manual = cleanRegionName(object?.primaryRegionName);
  if (manual) return [manual];
  const raw = String(object?.region || "").trim();
  const strong = raw.split(/[／/；;\n]+/).map(cleanRegionName).filter(Boolean);
  const rejected = /^(顶部|内部|源点|四面结构|未分位层|核心区|区域|主体|候选|项目模型|未标区域)$/;
  const moduleLike = /(?:模块|路径|分流|异文|校注|候选|项目|接口|走廊|主干|源段|代表段|拓扑|示意|排版)$/;
  const geographic = strong.filter(name => name.length >= 2 && !rejected.test(name) && !moduleLike.test(name));
  if (geographic.length) return [...new Set(geographic)];
  const typeText = `${object?.type || ""}${object?.name || ""}`;
  if (object?.geometryType === "area" && /(区域|国|野|海|林|山系|丘群|水网|泽|山)/.test(typeText)) {
    const fallback = cleanRegionName(object?.name);
    if (fallback) return [fallback];
  }
  return ["待考位置区"];
}

function regionModuleTags(object) {
  const raw = String(object?.region || "");
  return [...new Set(raw.split(/[／/；;\n、，,]+/).map(cleanRegionName).filter(name => name && /(?:模块|路径|分流|异文|候选|项目|接口|走廊|主干|源段|代表段)/.test(name)))];
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const V053_MACRO_DEFS = [
  { id: "region-macro-center", name: "中央地图区", sector: "central", order: 0 },
  { id: "region-macro-east", name: "东地图区", sector: "east", order: 1 },
  { id: "region-macro-northeast", name: "东北地图区", sector: "northeast", order: 2 },
  { id: "region-macro-north", name: "北地图区", sector: "north", order: 3 },
  { id: "region-macro-northwest", name: "西北地图区", sector: "northwest", order: 4 },
  { id: "region-macro-west", name: "西地图区", sector: "west", order: 5 },
  { id: "region-macro-southwest", name: "西南地图区", sector: "southwest", order: 6 },
  { id: "region-macro-south", name: "南地图区", sector: "south", order: 7 },
  { id: "region-macro-southeast", name: "东南地图区", sector: "southeast", order: 8 }
];

function automaticMacroId(x, y) {
  const distance = Math.hypot(x, y);
  if (distance <= 750) return "region-macro-center";
  const angle = Math.atan2(y, x) * 180 / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return "region-macro-east";
  if (angle >= 22.5 && angle < 67.5) return "region-macro-northeast";
  if (angle >= 67.5 && angle < 112.5) return "region-macro-north";
  if (angle >= 112.5 && angle < 157.5) return "region-macro-northwest";
  if (angle >= 157.5 || angle < -157.5) return "region-macro-west";
  if (angle >= -157.5 && angle < -112.5) return "region-macro-southwest";
  if (angle >= -112.5 && angle < -67.5) return "region-macro-south";
  return "region-macro-southeast";
}

function normalizeWaterPath053(path) {
  const level = String(path?.evidenceLevel || "G2").slice(0, 2).toUpperCase();
  const flow = String(path?.flowDirection || "").trim();
  const explicitText = /(东北|西北|东南|西南|向东|向西|向南|向北|东流|西流|南流|北流|东入|西入|南入|北入)/.test(flow)
    && !/(按棋盘|项目|示意|排版|待定|未定)/.test(flow);
  let directionEvidence = String(path?.directionEvidence || "").trim();
  if (!directionEvidence) {
    if (explicitText && level === "G1") directionEvidence = "original-text";
    else if (explicitText) directionEvidence = "textual";
    else if (level === "G1" || level === "G2") directionEvidence = "topology";
    else if (level === "G3") directionEvidence = "project-layout";
    else directionEvidence = "unresolved";
  }
  const projectOnly = /project|layout|示意|排版/i.test(directionEvidence) || level === "G3";
  const hasTextualFlowDirection = explicitText || path?.hasTextualFlowDirection === true;
  const hasTopologyDirection = !projectOnly && (hasTextualFlowDirection || path?.hasTopologyDirection === true || ((level === "G1" || level === "G2") && path?.hasDirection !== false));
  return {
    ...path,
    directionEvidence,
    hasTextualFlowDirection,
    hasTopologyDirection,
    hasDirection: hasTextualFlowDirection || hasTopologyDirection
  };
}

function buildHierarchy053(objects, waterPaths = [], previous = {}) {
  const validMacroIds = new Set(V053_MACRO_DEFS.map(item => item.id));
  const previousDetailIds = new Map((Array.isArray(previous?.regions) ? previous.regions : [])
    .filter(region => Number(region?.level) === 2 && region?.name && region?.id)
    .map(region => [cleanRegionName(region.name), region.id]));
  const regionIdForName = name => previousDetailIds.get(cleanRegionName(name)) || `region-detail-${stableHash(name)}`;
  const detailMap = new Map();
  const objectRegionNames = new Map();

  for (const object of objects) {
    const names = regionTokensStrict(object);
    objectRegionNames.set(object.id, names);
    object.regionModuleTags = regionModuleTags(object);
    for (const name of names) {
      const id = regionIdForName(name);
      if (!detailMap.has(id)) detailMap.set(id, { id, name, members: [], bounds: freshBounds(), manualMacroIds: [], rawNames: new Set(), chapters: new Map() });
      const detail = detailMap.get(id);
      detail.members.push(object.id);
      detail.rawNames.add(String(object.region || name).trim() || name);
      if (object.chapter) detail.chapters.set(object.chapter, (detail.chapters.get(object.chapter) || 0) + 1);
      extendBounds(detail.bounds, objectBoundsForRegion(object));
      if (object.macroAssignment === "manual" && validMacroIds.has(object.macroRegionId)) detail.manualMacroIds.push(object.macroRegionId);
    }
  }

  const details = [];
  for (const detail of detailMap.values()) {
    const rawBounds = validBounds(detail.bounds) ? detail.bounds : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const center = { x: (rawBounds.minX + rawBounds.maxX) / 2, y: (rawBounds.minY + rawBounds.maxY) / 2 };
    const manualMacroId = detail.manualMacroIds.find(id => validMacroIds.has(id));
    const parentRegionId = manualMacroId || automaticMacroId(center.x, center.y);
    details.push({
      id: detail.id,
      type: "region",
      level: 2,
      name: detail.name,
      parentRegionId,
      childRegionIds: [],
      memberObjectIds: [...new Set(detail.members)],
      objectCount: new Set(detail.members).size,
      bounds: paddedBounds(rawBounds, 45),
      center,
      centerX: center.x,
      centerY: center.y,
      description: "由“所属区域／山系”字段按强分隔符整理；模块、异文、路径和接口词不再自动升格为地图区域。",
      sourceType: "member-object-bounds",
      source: "所属区域／山系（v0.5.3规范化）",
      classification: "source-region",
      status: "draft",
      rawNames: [...detail.rawNames],
      chapterSummary: [...detail.chapters.entries()].sort((a, b) => b[1] - a[1]).map(([chapter, count]) => ({ chapter, count })),
      environmentProfile: null,
      boundary: [],
      boundaryEvidence: "none",
      macroAssignment: manualMacroId ? "manual" : "automatic",
      waterPathIds: []
    });
  }

  const detailById = new Map(details.map(region => [region.id, region]));
  for (const object of objects) {
    const ids = (objectRegionNames.get(object.id) || []).map(name => regionIdForName(name)).filter(id => detailById.has(id));
    object.regionIds = [...new Set(ids)];
    object.primaryRegionId = object.regionIds[0] || null;
    const originalMacroId = object.macroRegionId;
    const preserveManual = object.macroAssignment === "manual" && validMacroIds.has(originalMacroId);
    const parent = preserveManual ? originalMacroId : (detailById.get(object.primaryRegionId)?.parentRegionId || "region-macro-center");
    object.macroRegionId = parent;
    object.macroAssignment = preserveManual ? "manual" : "automatic";
  }

  const pathList = Array.isArray(waterPaths) ? waterPaths : [];
  for (const detail of details) {
    const names = new Set(detail.memberObjectIds.map(id => objects.find(object => object.id === id)?.name).filter(Boolean));
    detail.waterPathIds = pathList.filter(item => names.has(item.name) || (item.objectIds || []).some(id => detail.memberObjectIds.includes(id)) || detail.memberObjectIds.includes(item.objectId)).map(item => item.id).filter(Boolean);
  }

  const macros = V053_MACRO_DEFS.map(def => {
    const children = details.filter(region => region.parentRegionId === def.id);
    if (!children.length) return null;
    const memberObjectIds = [...new Set(children.flatMap(region => region.memberObjectIds))];
    const rawBounds = children.reduce((acc, region) => extendBounds(acc, region.bounds), freshBounds());
    const bounds = paddedBounds(rawBounds, 80);
    return {
      id: def.id,
      type: "region",
      level: 1,
      name: def.name,
      parentRegionId: "world-shanhaijing",
      childRegionIds: children.map(region => region.id),
      memberObjectIds,
      objectCount: memberObjectIds.length,
      bounds,
      center: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
      centerX: (bounds.minX + bounds.maxX) / 2,
      centerY: (bounds.minY + bounds.maxY) / 2,
      description: "项目坐标扇区，用于导航，不代表《山海经》原文明载区域。",
      sourceType: "automatic-coordinate-sector",
      source: "坐标方位自动分区",
      classification: "coordinate-macro",
      status: "draft",
      environmentProfile: null,
      order: def.order,
      boundary: [],
      boundaryEvidence: "automatic-sector",
      macroAssignment: "automatic"
    };
  }).filter(Boolean);

  const worldRawBounds = objects.reduce((acc, object) => extendBounds(acc, objectBoundsForRegion(object)), freshBounds());
  const worldBounds = paddedBounds(worldRawBounds, 120);
  const unresolvedRegionId = details.find(region => region.name === "待考位置区")?.id || null;
  const assignedObjectCount = objects.filter(object => object.primaryRegionId && object.primaryRegionId !== unresolvedRegionId).length;
  return {
    ...previous,
    schemaVersion: previous.schemaVersion || "world-region-place-1.0",
    generatedAt: new Date().toISOString(),
    generatedBy: "SHmap-v0.5.3",
    world: {
      ...(previous.world || {}),
      id: "world-shanhaijing",
      type: "world",
      level: 0,
      name: previous.world?.name || "山海经世界",
      objectCount: objects.length,
      bounds: worldBounds,
      childRegionIds: macros.map(region => region.id)
    },
    regions: [...macros, ...details],
    unassignedRegionId: unresolvedRegionId,
    stats: {
      ...(previous.stats || {}),
      macroRegionCount: macros.length,
      regionCount: details.length,
      assignedObjectCount,
      unassignedObjectCount: objects.length - assignedObjectCount
    }
  };
}

const appReplacement = {
  drawContextDimming: (function drawContextDimming(ctx, v) {
    // v0.5.3 hotfix：区域层级只负责导航与资料展示，不再通过逐格明暗制造“白色地块孔洞”。
    // 搜索聚焦和用户主动选择的面积／作用域聚焦仍保留。
    if (state.regionOverviewMode) return;
    const search = getSearchContext(), spatial = getSpatialFocusContext();
    let active = false, keep = new Set(), alpha = .36;
    if (search.q) {
      active = true;
      search.directCells.forEach(key => keep.add(key));
      search.relatedCells.forEach(key => keep.add(key));
      alpha = .38;
    } else if (spatial.active) {
      active = true;
      keep = spatial.memberCells;
      alpha = .34;
    }
    if (!active) return;
    const gxMin = Math.floor((v.left - 50) / 100) - 1;
    const gxMax = Math.ceil((v.right + 50) / 100) + 1;
    const gyMin = Math.floor((v.bottom - 50) / 100) - 1;
    const gyMax = Math.ceil((v.top + 50) / 100) + 1;
    ctx.save();
    ctx.fillStyle = `rgba(67,72,72,${alpha})`;
    for (let gx = gxMin; gx <= gxMax; gx += 1) {
      for (let gy = gyMin; gy <= gyMax; gy += 1) {
        const key = cellKey(gx, gy);
        if (keep.has(key)) continue;
        const bounds = cellBounds(gx, gy), nw = worldToScreen(bounds.west, bounds.north), se = worldToScreen(bounds.east, bounds.south);
        ctx.fillRect(nw.x, nw.y, se.x - nw.x, se.y - nw.y);
      }
    }
    ctx.restore();
  }).toString(),

  drawCanvas: (function drawCanvas(light = false) {
    const ctx = els.canvas.getContext("2d"), r = els.viewport.getBoundingClientRect(), dpr = els.canvas.width / r.width;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const v = visibleWorld(), s = scale(), cellPx = CELL_LI * s;
    ctx.fillStyle = state.precisionMode ? "#aeb1af" : "#cfd1d0";
    ctx.fillRect(0, 0, r.width, r.height);
    const grad = ctx.createRadialGradient(r.width * .15, r.height * .05, 0, r.width * .15, r.height * .05, r.width * .72);
    grad.addColorStop(0, "rgba(255,255,255,.22)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, r.width, r.height);
    state.perf.waterHitAreas = [];
    if (state.precisionMode) {
      drawPrecisionTerrain(ctx, v, s);
      drawPrecisionGrid(ctx, v, s);
      drawV044LocationWatermark(ctx, r);
      if (state.layers.rivers) { drawWaterPaths(ctx, v, s, true); drawPrecisionLines(ctx, v, s); }
    } else if (state.regionOverviewMode) {
      drawRegionOverviewBackdrops(ctx, v, s);
      if (state.layers.rivers) { drawWaterPaths(ctx, v, s, false); drawLines(ctx, v, s); }
    } else {
      if (state.layers.areas) drawAreas(ctx, v, s);
      drawGrid(ctx, v, s, cellPx);
      if (state.layers.rivers) { drawWaterPaths(ctx, v, s, false); drawLines(ctx, v, s); }
    }
    if (!state.regionOverviewMode) drawBrushSelection(ctx, v);
    // 轻量相机帧只负责底图与对象位置。区域遮罩、搜索强调和测量层会遍历可视格，
    // 在区域跳转动画中逐帧执行会造成明显卡顿；完整帧再补绘即可。
    if (!light) {
      drawContextDimming(ctx, v);
      drawSearchHighlights(ctx, v, s);
      drawV029MeasureOverlay(ctx, v, s);
    }
    drawOrigin(ctx, s);
  }).toString(),

  regionOverviewTokens: (function regionOverviewTokens(object) {
    const manual = cleanRegionOverviewName(object?.primaryRegionName || "");
    if (manual && !/^(候选|项目|接口|路径|模块)$/.test(manual)) return [manual];
    const raw = String(object?.region || "").trim();
    const moduleLike = /(?:模块|路径|分流|异文|校注|候选|项目|接口|走廊|主干|源段|代表段|拓扑|示意|排版)$/;
    const rejected = /^(顶部|内部|源点|四面结构|未分位层|核心区|区域|山系|主体|候选|项目模型)$/;
    const tokens = raw.split(/[／/；;\n]+/).map(segment => {
      const pieces = segment.split(/[、，,]+/).map(item => item.trim()).filter(Boolean);
      while (pieces.length > 1 && moduleLike.test(pieces.at(-1))) pieces.pop();
      return cleanRegionOverviewName(pieces.join("、"));
    }).filter(name => name.length >= 2 && !rejected.test(name) && !moduleLike.test(name));
    if (tokens.length) return [...new Set(tokens)];
    if (object?.geometryType === "area" && /(区域|国|野|海|林|山系|丘群|水网)/.test(String(object.type || "") + String(object.name || ""))) return [cleanRegionOverviewName(object.name)];
    return [];
  }).toString(),

  updateRegionOverviewMode: (function updateRegionOverviewMode() {
    const before = state.regionOverviewMode;
    if (state.precisionMode) state.regionOverviewMode = false;
    else if (!state.regionOverviewMode && state.camera.zoom <= REGION_OVERVIEW_ENTER_ZOOM) state.regionOverviewMode = true;
    else if (state.regionOverviewMode && state.camera.zoom >= REGION_OVERVIEW_EXIT_ZOOM) state.regionOverviewMode = false;
    els.viewport.classList.toggle("region-overview-mode", state.regionOverviewMode);
    if (before !== state.regionOverviewMode) {
      state.flippedCell = null;
      hideTooltip();
      els.viewport.classList.remove("region-overview-transition");
      // 模式切换时立即清空上一模式的 DOM，禁止区域标签与100里地块残留叠在一起。
      els.tileLayer.replaceChildren();
      state.perf.regionOverviewLayerActive = false;
      state.perf.regionOverviewNodes = new Map();
      state.perf.regionOverviewVisibleGroups = new Map();
    }
    if (els.mapGuide && !state.precisionMode) {
      els.mapGuide.innerHTML = state.regionOverviewMode
        ? "区域概览 · 仅显示区域名称与水系 · 放大至52%以上恢复地块"
        : "拖动地图 · 滚轮缩放 · 右键返回 · 放大至420%进入彩色精细地图";
    }
  }).toString(),

  renderRegionOverviewLayer: [
    (function regionOverviewCategoryText(items) {
      const labels = { terrain: "地貌", plants: "草木", animals: "鸟兽", minerals: "矿物", people: "人群神祇", events: "事迹" };
      return [...new Set(items.map(objectCategory))].slice(0, 3).map(key => labels[key] || "").filter(Boolean).join(" / ");
    }).toString(),
    (function ensureRegionOverviewNode(regionId) {
      if (!(state.perf.regionOverviewNodes instanceof Map)) state.perf.regionOverviewNodes = new Map();
      let button = state.perf.regionOverviewNodes.get(regionId);
      if (button) return button;
      button = document.createElement("button");
      button.type = "button";
      button.className = "region-overview-label";
      button.dataset.regionKey = regionId;
      const name = document.createElement("strong");
      name.className = "region-overview-name";
      const meta = document.createElement("span");
      meta.className = "region-overview-meta";
      button.append(name, meta);
      button._v053NameNode = name;
      button._v053MetaNode = meta;
      button.addEventListener("pointerdown", event => event.stopPropagation());
      button.addEventListener("click", event => {
        event.stopPropagation();
        v052SelectRegion(button.dataset.regionKey, true);
      });
      button.addEventListener("mouseenter", event => {
        const group = state.perf.regionOverviewVisibleGroups?.get(button.dataset.regionKey);
        if (!group) return;
        els.tooltip.className = "map-tooltip lens region-overview-lens";
        const sample = group.items.slice(0, 6).map(object => object.name).join(" / ");
        els.tooltip.innerHTML = `<strong>${esc(group.name)}</strong><span>${group.count}个对象 · 点击进入${state.camera.zoom <= .27 ? "世界大区" : "地图区域"}</span>${sample ? `<small>${esc(sample)}${group.items.length > 6 ? "……" : ""}</small>` : ""}`;
        els.tooltip.classList.remove("hidden");
        moveTooltip(event.clientX, event.clientY);
      });
      button.addEventListener("mousemove", event => moveTooltip(event.clientX, event.clientY));
      button.addEventListener("mouseleave", hideTooltip);
      state.perf.regionOverviewNodes.set(regionId, button);
      return button;
    }).toString(),
    (function renderRegionOverviewLayer() {
      const v = visibleWorld();
      const groups = regionOverviewGroups().filter(group => group.maxX >= v.left - 150 && group.minX <= v.right + 150 && group.maxY >= v.bottom - 150 && group.minY <= v.top + 150);
      const placed = regionOverviewLabelPlacement(groups);
      if (!state.perf.regionOverviewLayerActive) {
        els.tileLayer.replaceChildren();
        state.perf.regionOverviewNodes = new Map();
        state.perf.regionOverviewLayerActive = true;
      }
      const visible = new Map(placed.map(group => [group.regionId, group]));
      state.perf.regionOverviewVisibleGroups = visible;
      for (const group of placed) {
        const button = ensureRegionOverviewNode(group.regionId);
        const height = group.priority >= 7 ? 62 : 52;
        button.classList.toggle("major", group.priority >= 7);
        button.classList.toggle("selected", group.regionId === state.selectedRegionId);
        const left = `${Math.round(group.x - group.width / 2)}px`;
        const top = `${Math.round(group.y - height / 2)}px`;
        const width = `${Math.round(group.width)}px`;
        if (button.style.left !== left) button.style.left = left;
        if (button.style.top !== top) button.style.top = top;
        if (button.style.width !== width) button.style.width = width;
        if (button._v053NameNode.textContent !== group.name) button._v053NameNode.textContent = group.name;
        const categories = regionOverviewCategoryText(group.items);
        const metaText = `${group.count}项${categories ? ` · ${categories}` : ""}`;
        if (button._v053MetaNode.textContent !== metaText) button._v053MetaNode.textContent = metaText;
        if (button.parentNode !== els.tileLayer) els.tileLayer.appendChild(button);
      }
      for (const [regionId, node] of state.perf.regionOverviewNodes) {
        if (visible.has(regionId)) continue;
        node.remove();
        state.perf.regionOverviewNodes.delete(regionId);
      }
    }).toString()
  ].join(" "),

  drawRegionOverviewBackdrops: (function drawRegionOverviewBackdrops(ctx, v, s) {
    const groups = regionOverviewGroups();
    ctx.save();
    for (const group of groups) {
      if (group.maxX < v.left || group.minX > v.right || group.maxY < v.bottom || group.minY > v.top) continue;
      const region = v052RegionById(group.regionId);
      const boundary = Array.isArray(region?.boundary) ? region.boundary : (Array.isArray(region?.boundary?.points) ? region.boundary.points : []);
      const selected = group.regionId === state.selectedRegionId;
      ctx.beginPath();
      let drawable = false;
      if (boundary.length >= 3) {
        boundary.forEach((point, index) => {
          const x = Array.isArray(point) ? point[0] : point?.x;
          const y = Array.isArray(point) ? point[1] : point?.y;
          if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return;
          const screen = worldToScreen(Number(x), Number(y));
          if (!drawable || index === 0) ctx.moveTo(screen.x, screen.y); else ctx.lineTo(screen.x, screen.y);
          drawable = true;
        });
        if (drawable) ctx.closePath();
      } else if (selected) {
        const nw = worldToScreen(group.minX, group.maxY), se = worldToScreen(group.maxX, group.minY);
        ctx.rect(nw.x, nw.y, se.x - nw.x, se.y - nw.y);
        drawable = true;
      }
      if (!drawable) continue;
      const evidence = String(region?.boundaryEvidence || "none");
      const hard = /original|hard|原文/i.test(evidence);
      ctx.strokeStyle = selected ? "rgba(20,104,83,.78)" : "rgba(31,109,90,.36)";
      ctx.lineWidth = selected ? 2.4 : 1.3;
      ctx.setLineDash(hard ? [] : [8, 7]);
      if (hard) {
        ctx.fillStyle = "rgba(43,101,82,.055)";
        ctx.fill();
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }).toString(),


  v050UpdateModeBar: (function v050UpdateModeBar() {
    const bar = document.getElementById("v050ModeBar");
    if (!bar) return;
    const mode = v050ActiveMode();
    let selection = "未选对象";
    if (state.selectedRegionId && typeof v052RegionById === "function") {
      const region = v052RegionById(state.selectedRegionId);
      selection = region?.name ? `区域：${region.name}` : "区域：待刷新";
    } else if (state.selectedHierarchyNode === "world") {
      const hierarchy = typeof v052Hierarchy === "function" ? v052Hierarchy() : null;
      selection = `世界：${hierarchy?.world?.name || "山海经世界"}`;
    } else {
      const selected = indexedObject(state.selectedId);
      if (selected?.name) selection = selected.name;
      else if (state.selectedCell) {
        const items = objectsInCellKey(state.selectedCell);
        const fallback = items.find(object => object.id === state.selectedId) || items[0];
        if (fallback?.name) selection = fallback.name;
      }
    }
    bar.dataset.mode = mode.key;
    const modeNode = bar.querySelector("[data-v050-mode]");
    const hintNode = bar.querySelector("[data-v050-hint]");
    const selectionNode = bar.querySelector("[data-v050-selection]");
    if (modeNode && modeNode.textContent !== mode.label) modeNode.textContent = mode.label;
    if (hintNode && hintNode.textContent !== mode.hint) hintNode.textContent = mode.hint;
    const selectionText = `选中：${selection}`;
    if (selectionNode && selectionNode.textContent !== selectionText) selectionNode.textContent = selectionText;
    bar.querySelectorAll("[data-relation-depth]").forEach(button => button.classList.toggle("active", button.dataset.relationDepth === state.relationDepth));
    v050UpdateNavigationUi();
    v050UpdateHistoryUi();
    v050UpdateDetailEvidence();
  }).toString(),

  drawLines: [
    (function nonWaterLineStyle(object) {
      const text = `${object?.lineKind || ""} ${object?.type || ""} ${object?.name || ""}`;
      if (/边界|boundary/i.test(text)) return { color: "#56796f", dash: [8, 6], width: 1.8, directed: false };
      if (/山系|山脉|mountain/i.test(text)) return { color: "#806b4e", dash: [], width: 2.4, directed: false };
      if (/路线|行程|route|迁徙/i.test(text)) return { color: "#9a6c35", dash: [10, 5], width: 2.2, directed: object?.directed === true };
      if (/关系|relation|连接/i.test(text)) return { color: "#66747a", dash: [4, 5], width: 1.8, directed: object?.directed === true };
      return { color: "#6f756f", dash: object?.lineDash || [], width: 2, directed: object?.directed === true };
    }).toString(),
    (function drawLines(ctx, v, s) {
      ensureObjectIndexes().lines.filter(object => !isHydrologyObject(object)).forEach(object => {
        if (!Array.isArray(object.path) || object.path.length < 2) return;
        const style = nonWaterLineStyle(object);
        ctx.save();
        ctx.strokeStyle = style.color;
        ctx.fillStyle = style.color;
        ctx.lineWidth = Math.max(1.5, Math.min(8, style.width * state.camera.zoom));
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash(style.dash);
        ctx.beginPath();
        object.path.forEach((point, index) => {
          const screen = worldToScreen(point[0], point[1]);
          if (index === 0) ctx.moveTo(screen.x, screen.y); else ctx.lineTo(screen.x, screen.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        if (style.directed) {
          const a = object.path.at(-2), b = object.path.at(-1), pa = worldToScreen(a[0], a[1]), pb = worldToScreen(b[0], b[1]);
          const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
          ctx.beginPath();
          ctx.moveTo(pb.x, pb.y);
          ctx.lineTo(pb.x - 8 * Math.cos(angle - .45), pb.y - 8 * Math.sin(angle - .45));
          ctx.lineTo(pb.x - 8 * Math.cos(angle + .45), pb.y - 8 * Math.sin(angle + .45));
          ctx.closePath();
          ctx.fill();
        }
        if (state.camera.zoom > .72) {
          const middle = object.path[Math.floor((object.path.length - 1) / 2)], point = worldToScreen(middle[0], middle[1]);
          ctx.font = "700 9px sans-serif";
          ctx.textBaseline = "bottom";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(245,247,246,.92)";
          ctx.strokeText(object.name, point.x + 6, point.y - 5);
          ctx.fillStyle = style.color;
          ctx.fillText(object.name, point.x + 6, point.y - 5);
        }
        ctx.restore();
      });
    }).toString()
  ].join(" "),

  waterDirectionGlyph: [
    (function waterDirectionMode(path) {
      if (!path || path.hasDirection === false) return "none";
      const evidence = String(path.directionEvidence || "").toLowerCase();
      const level = String(path.evidenceLevel || "G2").slice(0, 2).toUpperCase();
      if (/project|layout|示意|排版/.test(evidence) || level === "G3") return "none";
      if (path.hasTextualFlowDirection === true || /original-text|textual|原文/.test(evidence)) return "text";
      if (path.hasTopologyDirection === true || /topology|拓扑/.test(evidence) || ((level === "G1" || level === "G2") && path.hasDirection !== false)) return "topology";
      return "none";
    }).toString(),
    (function waterDirectionGlyph(path) {
      const mode = waterDirectionMode(path);
      if (mode === "none") return "";
      const text = String(path?.flowDirection || "");
      if (/东北/.test(text)) return "↗";
      if (/西北/.test(text)) return "↖";
      if (/东南/.test(text)) return "↘";
      if (/西南/.test(text)) return "↙";
      if (/东/.test(text)) return "→";
      if (/西/.test(text)) return "←";
      if (/北/.test(text)) return "↑";
      if (/南/.test(text)) return "↓";
      if (mode !== "topology") return "";
      const points = path?.points || [], a = points[0], b = points.at(-1);
      if (!a || !b) return "";
      const dx = Number(b[0]) - Number(a[0]), dy = Number(b[1]) - Number(a[1]);
      if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return "";
      const horizontal = Math.abs(dx) >= Math.abs(dy) * .45, vertical = Math.abs(dy) >= Math.abs(dx) * .45;
      if (horizontal && vertical) return dx >= 0 ? (dy >= 0 ? "↗" : "↘") : (dy >= 0 ? "↖" : "↙");
      return Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? "→" : "←") : (dy >= 0 ? "↑" : "↓");
    }).toString()
  ].join(" "),

  drawWaterFlowArrows: (function drawWaterFlowArrows(ctx, path, pts, style, active, hydrology, muted) {
    const mode = waterDirectionMode(path);
    if (mode === "none") return;
    const total = waterPolylineLength(pts);
    if (total < 18) return;
    const topology = mode === "topology";
    const spacing = topology ? (hydrology ? 132 : 158) : (hydrology ? 88 : 118);
    const maxCount = topology ? (active ? 4 : 2) : (active ? 7 : hydrology ? 5 : 3);
    const count = Math.max(1, Math.min(maxCount, Math.floor(total / spacing) || 1));
    const size = Math.max(7.2, Math.min(11.5, (7.3 + state.camera.zoom * 1.05) * Math.min(v050TextScaleValue(), 1.28)));
    const color = active ? "#0b5872" : style.color;
    for (let index = 1; index <= count; index += 1) {
      const sample = waterPointAtDistance(pts, total * index / (count + 1));
      const alpha = muted ? .25 : topology ? (active ? .82 : .58) : (active ? 1 : hydrology ? .96 : .88);
      drawWaterFlowArrow(ctx, sample, size, color, alpha);
    }
  }).toString()
};

const runtimeHierarchyNormalizer = (function v053NormalizeHierarchyAssignments() {
  const hierarchy = window.SHJ_WORLD_HIERARCHY;
  if (!hierarchy || !Array.isArray(hierarchy.regions) || !Array.isArray(state?.objects)) return;
  const detailRegions = hierarchy.regions.filter(region => Number(region.level) === 2);
  const memberships = new Map();
  for (const region of detailRegions) {
    for (const objectId of region.memberObjectIds || []) {
      if (!memberships.has(objectId)) memberships.set(objectId, []);
      memberships.get(objectId).push(region.id);
    }
  }
  const regionById = new Map(hierarchy.regions.map(region => [region.id, region]));
  let changed = false;
  for (const object of state.objects) {
    const ids = memberships.get(object.id);
    if (!ids?.length) continue;
    const current = Array.isArray(object.regionIds) ? object.regionIds : [];
    const currentValid = current.length > 0 && current.includes(object.primaryRegionId) && current.every(id => regionById.has(id));
    if (!currentValid) {
      object.regionIds = [...ids];
      object.primaryRegionId = ids[0];
      changed = true;
    }
    if (object.macroAssignment !== "manual") {
      const parent = regionById.get(object.primaryRegionId)?.parentRegionId;
      if (parent && object.macroRegionId !== parent) {
        object.macroRegionId = parent;
        object.macroAssignment = "automatic";
        changed = true;
      }
    }
  }
  if (changed && state.perf) {
    state.perf.objectIndexes = null;
    state.perf.regionOverviewLayerActive = false;
  }
}).toString();


const runtimeVisualStability = (function v053InstallVisualStability() {
  let style = document.getElementById("v053-visual-stability-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "v053-visual-stability-style";
    style.textContent = `
      /* 区域索引不再对普通地块做逐格明暗处理，避免白色方块与闪烁。 */
      .tile.hierarchy-region-dim,
      .precision-object-group.hierarchy-region-dim {
        opacity: 1 !important;
        filter: none !important;
      }
      .tile.hierarchy-region-member .tile-card { box-shadow: none !important; }
      .precision-object-group.hierarchy-region-member .precision-marker { filter: none !important; }
      .map-viewport.region-overview-mode .tile { display: none !important; }
      .map-viewport:not(.region-overview-mode) .region-overview-label { display: none !important; }
    `;
    document.head.appendChild(style);
  }
  // 清理热更新或模式切换遗留的层级样式。
  document.querySelectorAll(".hierarchy-region-dim,.hierarchy-region-member").forEach(node => {
    node.classList.remove("hierarchy-region-dim", "hierarchy-region-member");
  });
}).toString();

function patchAppJs(source) {
  let output = source;
  output = replaceFunction(output, "drawContextDimming", "drawSearchHighlights", appReplacement.drawContextDimming);
  output = replaceFunction(output, "drawCanvas", "drawGrid", appReplacement.drawCanvas);
  output = replaceFunction(output, "regionOverviewTokens", "regionOverviewGroups", appReplacement.regionOverviewTokens);
  output = replaceFunction(output, "updateRegionOverviewMode", "regionOverviewLabelPlacement", appReplacement.updateRegionOverviewMode);
  output = replaceFunction(output, "renderRegionOverviewLayer", "drawRegionOverviewBackdrops", appReplacement.renderRegionOverviewLayer);
  output = replaceFunction(output, "drawRegionOverviewBackdrops", "renderMap", appReplacement.drawRegionOverviewBackdrops);
  output = replaceFunction(output, "drawLines", "waterEvidenceStyle", appReplacement.drawLines);
  output = replaceFunction(output, "waterDirectionGlyph", "drawWaterFlowArrow", appReplacement.waterDirectionGlyph);
  output = replaceFunction(output, "drawWaterFlowArrows", "waterRoundRect", appReplacement.drawWaterFlowArrows);
  output = replaceFunction(output, "v050UpdateModeBar", "v050UpdateNavigationUi", appReplacement.v050UpdateModeBar);
  if (!output.includes("function v053NormalizeHierarchyAssignments") && output.includes("setupV052Features();")) {
    output = replaceOnce(output, "setupV052Features();", `${runtimeHierarchyNormalizer} v053NormalizeHierarchyAssignments(); ${runtimeVisualStability} v053InstallVisualStability(); setupV052Features();`, "v0.5.3运行时层级归属与视觉稳定同步");
  }
  return output;
}

function importerHelpersSource() {
  const helpers = [
    finite, extendBounds, freshBounds, validBounds, paddedBounds, objectBoundsForRegion,
    cleanRegionName, regionTokensStrict, regionModuleTags, stableHash, automaticMacroId,
    normalizeWaterPath053, buildHierarchy053
  ].map(fn => fn.toString()).join(" ");
  return `const V053_MACRO_DEFS=${JSON.stringify(V053_MACRO_DEFS)}; ${helpers}`;
}

function patchImporter(source) {
  let output = source;
  if (output.includes("SHmap-v0.5.3-import-normalizer")) return output;

  const worldMarker = functionMarker("buildWorldHierarchy");
  const waterMarker = functionMarker("buildWaterPaths");
  if (!output.includes(worldMarker) || !output.includes(waterMarker)) fail("import-master.mjs 缺少 buildWorldHierarchy 或 buildWaterPaths");

  output = replaceOnce(output, worldMarker, functionMarker("buildWorldHierarchyLegacyV052"), "旧世界层级构建函数");
  output = replaceOnce(output, waterMarker, functionMarker("buildWaterPathsLegacyV052"), "旧水系构建函数");

  const insertionMarker = output.includes(functionMarker("coord")) ? functionMarker("coord") : output.includes(functionMarker("originalLibrary")) ? functionMarker("originalLibrary") : null;
  if (!insertionMarker) fail("import-master.mjs 中找不到辅助函数插入位置");

  const wrapper = `/* SHmap-v0.5.3-import-normalizer */ ${importerHelpersSource()} function buildWaterPaths(...args){const result=buildWaterPathsLegacyV052(...args);if(Array.isArray(result))return result.map(normalizeWaterPath053);if(result&&Array.isArray(result.paths))return {...result,paths:result.paths.map(normalizeWaterPath053)};return result} function buildWorldHierarchy(...args){const objects=Array.isArray(args[0])?args[0]:[];const waterPaths=Array.isArray(args[1])?args[1]:[];let previous={};try{previous=buildWorldHierarchyLegacyV052(...args)||{}}catch(error){console.warn("v0.5.3：旧层级仅作为兼容模板读取失败",error?.message||error)}return buildHierarchy053(objects,waterPaths,previous)} `;
  output = replaceOnce(output, insertionMarker, wrapper + insertionMarker, "v0.5.3 导入归一化器插入点");
  return output;
}

function migrateDataJs(source) {
  const initialParsed = parseAssignedJson(source, "window.SHJ_INITIAL_DATA=");
  const waterParsed = parseAssignedJson(source, "window.SHJ_WATER_PATHS=");
  const hierarchyParsed = parseAssignedJson(source, "window.SHJ_WORLD_HIERARCHY=");
  const initial = initialParsed.value;
  if (!Array.isArray(initial?.objects)) fail("SHJ_INITIAL_DATA.objects 不是数组");
  const waterPaths = (Array.isArray(waterParsed.value) ? waterParsed.value : []).map(normalizeWaterPath053);
  const hierarchy = buildHierarchy053(initial.objects, waterPaths, hierarchyParsed.value || {});
  initial.metadata = {
    ...(initial.metadata || {}),
    schemaVersion: initial.metadata?.schemaVersion || "desktop-1.2-world-hierarchy",
    appVersion: VERSION,
    hierarchyMigration: "v0.5.3-strict-region-and-local-water-bounds"
  };
  let output = source;
  output = replaceAssignedJson(output, "window.SHJ_INITIAL_DATA=", initial);
  output = replaceAssignedJson(output, "window.SHJ_WATER_PATHS=", waterPaths);
  output = replaceAssignedJson(output, "window.SHJ_WORLD_HIERARCHY=", hierarchy);
  return { source: output, stats: { objects: initial.objects.length, paths: waterPaths.length, regions: hierarchy.stats.regionCount, macros: hierarchy.stats.macroRegionCount } };
}


export { VERSION, EDITION, patchAppJs, patchImporter, migrateDataJs, normalizeWaterPath053, buildHierarchy053 };
