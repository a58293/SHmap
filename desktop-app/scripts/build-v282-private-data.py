from __future__ import annotations

import collections
import datetime as dt
import hashlib
import json
import math
import re
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "v282.xlsx"
SOURCE_DISPLAY_NAME = "山海经原典地图_都广之野核心区_v282_十八卷世界分层逐条重审单画布校正版.xlsx"
OLD_BUNDLE = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else Path(r"F:\SHmap\SHmap-Data\production\map-data.json")
OUTPUT = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else ROOT / "SHmap-Data-v282"
M = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
P = "http://schemas.openxmlformats.org/package/2006/relationships"
CELL_LI = 100


def column_name(index: int) -> str:
    result = ""
    index += 1
    while index:
        index, rem = divmod(index - 1, 26)
        result = chr(65 + rem) + result
    return result


def col_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref or "A").group(0)
    value = 0
    for char in letters:
        value = value * 26 + ord(char) - 64
    return value - 1


def row_index(ref: str) -> int:
    match = re.search(r"(\d+)$", ref or "")
    return int(match.group(1)) if match else 0


def read_shared(archive: zipfile.ZipFile) -> list[str]:
    out: list[str] = []
    for _, node in ET.iterparse(archive.open("xl/sharedStrings.xml"), events=("end",)):
        if node.tag == f"{{{M}}}si":
            out.append("".join(t.text or "" for t in node.iter(f"{{{M}}}t")))
            node.clear()
    return out


def sheet_paths(archive: zipfile.ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {node.attrib["Id"]: node.attrib["Target"].lstrip("/") for node in rels.findall(f"{{{P}}}Relationship")}
    result = {}
    for sheet in workbook.find(f"{{{M}}}sheets"):
        target = targets[sheet.attrib[f"{{{R}}}id"]]
        result[sheet.attrib["name"]] = target if target.startswith("xl/") else f"xl/{target}"
    return result


def read_sheet(archive: zipfile.ZipFile, path: str, shared: list[str]) -> tuple[dict[str, object], dict[str, str], dict[str, int]]:
    values: dict[str, object] = {}
    formulas: dict[str, str] = {}
    styles: dict[str, int] = {}
    for _, node in ET.iterparse(archive.open(path), events=("end",)):
        if node.tag != f"{{{M}}}c":
            continue
        ref = node.attrib.get("r", "")
        kind = node.attrib.get("t", "")
        styles[ref] = int(node.attrib.get("s", "0"))
        formula = node.find(f"{{{M}}}f")
        if formula is not None and formula.text:
            formulas[ref] = formula.text
        v = node.find(f"{{{M}}}v")
        raw = v.text if v is not None and v.text else ""
        if kind == "s" and raw:
            value: object = shared[int(raw)]
        elif kind == "inlineStr":
            inline = node.find(f"{{{M}}}is")
            value = "".join(t.text or "" for t in inline.iter(f"{{{M}}}t")) if inline is not None else ""
        elif raw and kind not in {"str", "e"}:
            try:
                value = float(raw) if "." in raw else int(raw)
            except ValueError:
                value = raw
        else:
            value = raw
        values[ref] = value
        node.clear()
    return values, formulas, styles


def normalize(value: object) -> str:
    return str(value if value is not None else "").replace("\r\n", "\n").replace("\r", "\n").strip()


def parse_xy(text: str) -> tuple[float, float]:
    match = re.search(r"X\s*=\s*([+-]?\d+(?:\.\d+)?)里.*?Y\s*=\s*([+-]?\d+(?:\.\d+)?)里", text, re.S)
    return (float(match.group(1)), float(match.group(2))) if match else (0.0, 0.0)


def read_old() -> tuple[dict[str, object], list[dict[str, object]]]:
    bundle = json.loads(OLD_BUNDLE.read_text(encoding="utf-8"))
    globals_ = bundle["globals"]
    return globals_, globals_["SHJ_INITIAL_DATA"]["objects"]


old_globals, old_objects = read_old()
old_by_row = {normalize(item.get("rowRef")): item for item in old_objects}
old_by_identity: dict[tuple[str, str], list[dict[str, object]]] = collections.defaultdict(list)
for item in old_objects:
    old_by_identity[(normalize(item.get("name")), normalize(item.get("chapter")))].append(item)


with zipfile.ZipFile(SOURCE) as archive:
    shared = read_shared(archive)
    paths = sheet_paths(archive)
    total, total_formulas, _ = read_sheet(archive, paths["都广核心区总表"], shared)
    board, _, board_styles = read_sheet(archive, paths["坐标棋盘图"], shared)
    library, _, _ = read_sheet(archive, paths["山海经原文总库"], shared)

headers: dict[str, int] = {}
for ref, value in total.items():
    if row_index(ref) == 8 and normalize(value):
        headers[normalize(value)] = col_index(ref)


def total_value(row: int, label: str) -> object:
    return total.get(f"{column_name(headers[label])}{row}", "")


def board_value(address: str) -> str:
    return normalize(board.get(address, ""))


def library_value(row: int, col: int) -> str:
    return normalize(library.get(f"{column_name(col)}{row}", ""))


def parent_from_jump(formula: str) -> int:
    match = re.search(r"(?:原文总库|山海经原文总库)'?!A(\d+)", formula or "")
    return int(match.group(1)) if match else 0


def original_text(row: int) -> str:
    formula = total_formulas.get(f"{column_name(headers['原文段落／跳转'])}{row}", "")
    linked = parent_from_jump(formula)
    return library_value(linked, 2) if linked else ""


def display_layer(layer: str) -> tuple[str, str]:
    if layer.startswith("L1"):
        return "region-layer-l1-central", "中央大陆／海内陆核"
    if layer.startswith("L2"):
        return "region-layer-l2-seas", "四海分界带／海体与海中节点"
    if layer.startswith("L3"):
        return "region-layer-l3-overseas", "海外近海大陆"
    return "region-layer-l4-wilderness", "大荒外围大陆"


def coordinate_grade(nature: str) -> str:
    match = re.search(r"【(G[1-4][^】]*)】", nature)
    return match.group(1) if match else ""


def infer_geometry(type_: str, name: str, range_: str, old: dict[str, object] | None) -> tuple[str, object, object]:
    waterish = re.search(r"水|河|海|泽|澤|湖|渊|淵|池|溪|泉|江|流沙", f"{type_} {name}")
    area_water = re.search(r"海域|湖|泽|澤|渊|淵|池|水体|水域面积|大泽|洞庭", f"{type_} {name}") and not re.search(r"河流|水系|源点|源段|方向节点|代表段|水路", type_)
    if waterish and not area_water:
        return "line", None, None
    return normalize(old.get("geometryType") if old else "") or "point", (old or {}).get("area"), (old or {}).get("path")


objects: list[dict[str, object]] = []
used_ids: set[str] = set()
placements_by_cell: dict[str, list[dict[str, object]]] = collections.defaultdict(list)
for row in range(9, 1387):
    raw_name = normalize(total_value(row, "地名"))
    variants_value = normalize(total_value(row, "异文"))
    name = raw_name
    # V282 gives a single normalized display ruling for R556 in the audit
    # field while the formal-name column retains the shorter source name.
    # Apply only this explicit spreadsheet instruction; do not infer aliases.
    if row == 556 and "V276规范显示：封渊（赤泽水）" in variants_value:
        name = "封渊（赤泽水）"
    if not name:
        continue
    row_ref = f"R{row}"
    chapter = normalize(total_value(row, "所属经篇"))
    old = old_by_row.get(row_ref)
    if old and normalize(old.get("name")) != name:
        candidates = old_by_identity.get((name, chapter), [])
        old = candidates[0] if len(candidates) == 1 else old
    if old:
        object_id = normalize(old.get("id"))
    else:
        object_id = f"SHJ-OBJ-{row - 8:06d}"
    if object_id in used_ids:
        object_id = f"SHJ-OBJ-V282-{row:06d}"
    used_ids.add(object_id)
    coordinate_text = normalize(total_value(row, "坐标／显示位置"))
    x, y = parse_xy(coordinate_text)
    status = normalize(total_value(row, "表2坐标状态"))
    world_layer = normalize(total_value(row, "世界层级裁决"))
    layer_id, layer_name = display_layer(world_layer)
    address = normalize(total_value(row, "表2格位"))
    col = col_index(address)
    sheet_row = row_index(address)
    gx, gy = int(round(x / CELL_LI)), int(round(y / CELL_LI))
    type_ = normalize(total_value(row, "类型"))
    range_ = normalize(total_value(row, "对象范围／占地"))
    geometry_type, area, path = infer_geometry(type_, name, range_, old)
    nature = normalize(total_value(row, "坐标性质"))
    placement = {
        "sourceSheet": "坐标棋盘图", "sourceWorkbookVersion": "V282", "cell": address,
        "row": sheet_row, "col": col + 1, "gx": gx, "gy": gy, "canvasX": x, "canvasY": y,
        "metric": world_layer.startswith("L1"),
        "metricMeaning": "100里正式比例" if world_layer.startswith("L1") else "单画布世界结构显示位置；不得由格数反推海宽或外围实距",
        "officialFormalObject": True,
    }
    obj = {
        "id": object_id, "rowRef": row_ref, "x": x, "y": y, "coordinateText": coordinate_text,
        "name": name, "type": type_, "chapter": chapter,
        "region": normalize(total_value(row, "所属区域／山系")),
        "direction": normalize(total_value(row, "相对都广方向")),
        "distance": round(math.hypot(x, y), 1),
        "originalHardDistance": total_value(row, "距都广距离（原文硬证据；无则空）"),
        "reference": normalize(total_value(row, "直接参照地和原文方向")),
        "originalDistance": normalize(total_value(row, "原文距离")),
        "coordinateNature": nature, "evidenceLevel": coordinate_grade(nature),
        "lockStatus": normalize(total_value(row, "锁定状态")), "range": range_,
        "terrain": normalize(total_value(row, "地貌")), "water": normalize(total_value(row, "水系")),
        "plants": normalize(total_value(row, "植物")), "animals": normalize(total_value(row, "动物")),
        "minerals": normalize(total_value(row, "矿物")), "wildlife": normalize(total_value(row, "野兽")),
        "beasts": normalize(total_value(row, "怪物／异兽")), "people": normalize(total_value(row, "人物")),
        "gods": normalize(total_value(row, "神祇")), "residents": normalize(total_value(row, "族群居民")),
        "appearance": normalize(total_value(row, "外形特征")), "abilities": normalize(total_value(row, "能力／功效／征兆")),
        "events": normalize(total_value(row, "事件")), "original": original_text(row),
        "originalLink": total_formulas.get(f"{column_name(headers['原文段落／跳转'])}{row}", ""),
        "sameName": normalize(total_value(row, "全书同名检索")), "annotations": normalize(total_value(row, "古注")),
        "otherTexts": normalize(total_value(row, "其他古籍")), "variants": variants_value,
        "modernResearch": normalize(total_value(row, "现代考证")), "commonLocation": normalize(total_value(row, "常见定位说")),
        "popularSources": normalize(total_value(row, "百度／维基补充")), "misconceptions": normalize(total_value(row, "误传辨析")),
        "derivation": normalize(total_value(row, "设定与推导")), "sourceUrl": normalize(total_value(row, "来源 URL")),
        "worldLayerDecision": world_layer, "boardCoordinateStatus": status,
        "adjustmentRule": normalize(total_value(row, "推定依据／允许调整方式")), "boardCell": address,
        "coordinateConfidence": "locked" if status == "关系锁定" else "inferred",
        "geometryType": geometry_type, "area": area, "path": path,
        "worldEvidenceLayer": world_layer, "worldDisplayLayer": layer_id, "worldDisplaySubregion": layer_name,
        "primaryRegionId": layer_id, "regionIds": [layer_id], "macroRegionId": layer_id, "macroAssignment": "excel-v282",
        "boardPlacement": placement,
        "imageUrl": normalize((old or {}).get("imageUrl")),
    }
    if old:
        for key in ["images", "imageSource", "imageCopyright", "dossier", "childHierarchy", "waterHierarchy", "notesLocal"]:
            if key in old:
                obj[key] = old[key]
    objects.append(obj)
    placements_by_cell[address].append(obj)

for items in placements_by_cell.values():
    for index, item in enumerate(items, 1):
        item["boardPlacement"]["stackSize"] = len(items)
        item["boardPlacement"]["stackIndex"] = index

occupied_cells = []
for address, items in sorted(placements_by_cell.items(), key=lambda pair: (row_index(pair[0]), col_index(pair[0]))):
    first = items[0]["boardPlacement"]
    occupied_cells.append({
        "cell": address, "row": first["row"], "col": first["col"], "gx": first["gx"], "gy": first["gy"],
        "canvasX": first["canvasX"], "canvasY": first["canvasY"], "objectRowRefs": [item["rowRef"] for item in items],
        "objectCount": len(items), "text": board_value(address),
    })

hierarchy_regions = []
layer_counts = collections.Counter(item["worldDisplayLayer"] for item in objects)
layer_names = {
    "region-layer-l1-central": "L1 中央大陆／海内陆核",
    "region-layer-l2-seas": "L2 四海分界带／海体与海中节点",
    "region-layer-l3-overseas": "L3 海外近海大陆",
    "region-layer-l4-wilderness": "L4 大荒外围大陆",
}
for layer_id, label in layer_names.items():
    members = [item for item in objects if item["worldDisplayLayer"] == layer_id]
    hierarchy_regions.append({
        "id": layer_id, "name": label, "type": "region", "level": 1, "parentRegionId": "world-shanhaijing",
        "childRegionIds": [], "memberObjectIds": [item["id"] for item in members], "objectCount": len(members),
        "center": {"x": sum(float(item["x"]) for item in members) / len(members), "y": sum(float(item["y"]) for item in members) / len(members)},
        "bounds": {"minX": min(float(item["x"]) for item in members), "maxX": max(float(item["x"]) for item in members), "minY": min(float(item["y"]) for item in members), "maxY": max(float(item["y"]) for item in members)},
        "status": "excel-v282-authoritative", "source": "V282 世界层级裁决",
    })

original_library = []
for row in range(9, 19907):
    values = [library_value(row, col) for col in range(11)]
    if not any(values):
        continue
    original_library.append({
        "row": values, "paragraphId": values[0], "chapter": values[1], "text": values[2], "geography": values[3],
        "type": values[4], "jump": values[5], "source": values[6], "returnDirectory": values[7], "entered": values[8],
        "coordinateStatus": values[9], "status": values[10],
    })

# V282 has no separate machine-readable path table. Keep the reviewed V272 paths as legacy overlays,
# but never let them override V282 object placement or the V282 coordinate status.
water_paths = old_globals["SHJ_WATER_PATHS"]
for path in water_paths:
    path["overlaySourceVersion"] = "V272"
    path["officialObjectPlacementSource"] = "V282"
    path["migrationNote"] = "保留既有审定水系叠加；节点对象的位置与世界层级以V282电子表格为准"
board_layout = {
    "schemaVersion": "v282-board-layout-1", "sourceWorkbook": SOURCE.name, "sourceSheet": "坐标棋盘图",
    "origin": {"name": "都广之野", "x": 0, "y": 0, "cell": "FF146", "sourceCol": 162, "sourceRow": 146, "sourceGx": 0, "sourceGy": 0, "metric": True},
    "canvasUnit": "display-cell-100", "objectCount": len(objects), "occupiedCellCount": len(occupied_cells),
    "coordinateBounds": {"minGx": -160, "maxGx": 140, "minGy": -136, "maxGy": 140, "minX": -160, "maxX": 140, "minY": -136, "maxY": 140},
    "rules": [
        "R9—R1386正式对象必须按V282表2格位实装", "都广之野固定为唯一全局原点(0,0)",
        "L1中央大陆百里链继续按1格=100里", "四海宽度、海外近海和大荒外围轮廓不得反推为原典实距",
        "关系锁定对象新增冲突前不得单点移动", "红色推定对象只能按V282允许调整方式移动；山系组与附着对象不得拆散",
        "山体不继承注流短语；水体才显示原文流向与注入关系", "表2不显示R号与工程组件码",
    ],
    "occupiedCells": occupied_cells, "sourcePrintArea": "A1:KP630",
    "backgroundRuns": [], "backgroundRunCount": 0,
    "worldLabels": [
        {"cell": "FF146", "gx": 0, "gy": 0, "canvasX": 0, "canvasY": 0, "kind": "central", "name": "中央大陆／海内陆核", "text": "L1 中央大陆／海内陆核"},
        {"cell": "FF36", "gx": 0, "gy": 110, "canvasX": 0, "canvasY": 11000, "kind": "outer", "name": "海外近海／大荒北部", "text": "L3/L4 北部"},
        {"cell": "FF256", "gx": 0, "gy": -110, "canvasX": 0, "canvasY": -11000, "kind": "outer", "name": "海外近海／大荒南部", "text": "L3/L4 南部"},
        {"cell": "V146", "gx": -140, "gy": 0, "canvasX": -14000, "canvasY": 0, "kind": "outer", "name": "海外近海／大荒西部", "text": "L3/L4 西部"},
        {"cell": "JQ146", "gx": 140, "gy": 0, "canvasX": 14000, "canvasY": 0, "kind": "outer", "name": "海外近海／大荒东部", "text": "L3/L4 东部"},
    ],
    "worldLabelCount": 5, "annotations": [], "annotationCount": 0, "arrowAnnotationCount": 0,
}

generated_at = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
metadata = {
    "appName": "山海经原典地图研究台 桌面版", "dataVersion": "v282-r0001", "schemaVersion": "desktop-v282-world-hierarchy",
    "specResearch": "v282", "specProduction": "v282", "origin": {"name": "都广之野", "x": 0, "y": 0},
    "mainGridLi": 100, "innerGridLi": 10, "objectCount": len(objects), "paragraphEntryCount": len(original_library),
    "waterPathCount": len(water_paths), "waterArrowCellCount": 0, "generatedAt": generated_at, "sourceWorkbook": SOURCE_DISPLAY_NAME,
    "worldLayerCounts": {key: layer_counts[key] for key in layer_names},
    "coordinateStatusCounts": dict(collections.Counter(item["boardCoordinateStatus"] for item in objects)),
    "boardOccupiedCellCount": len(occupied_cells),
}
initial = {"metadata": metadata, "objects": objects}
hierarchy = {
    "schemaVersion": "world-region-place-v282", "generatedAt": generated_at,
    "world": {"id": "world-shanhaijing", "name": "山海经世界", "type": "world", "origin": {"name": "都广之野", "x": 0, "y": 0},
              "unit": "里", "mainGridLi": 100, "innerGridLi": 10, "childRegionIds": list(layer_names),
              "bounds": {"minX": -16000, "maxX": 14000, "minY": -13600, "maxY": 14000}, "objectCount": len(objects), "status": "v282-authoritative"},
    "regions": hierarchy_regions, "places": [], "unassignedRegionId": "", "stats": {"macroRegionCount": 4, "regionCount": 4, "assignedObjectCount": len(objects), "unassignedObjectCount": 0},
}
spec = {
    "precedence": "V282电子表格优先于V272和客户端旧字段",
    "rules": [
        ["正式对象", "十八卷1378项全部进入唯一棋盘，缺失0、重复0"],
        ["世界层级", "L1中央大陆／海内陆核 → L2四海 → L3海外近海大陆 → L4大荒外围大陆"],
        ["固定原点", "都广之野中心=(0,0)，全图只有一个棋盘"],
        ["坐标证据", "关系锁定115项；红色推定1263项。红色只表示绝对世界锚点可调，不否定内部原典关系"],
        ["比例", "L1百里链继续按1格=100里；海宽、岸线与外围面积不得反推成原典实距"],
        ["名称", "参考图简称、异体和误写只进入检索别名，不复制成第二对象"],
        ["显示", "只显示原典正式名称、原文方向里数、水体流向、区域语义和推定状态；不显示R号及工程码"],
    ],
}
globals_ = {
    "SHJ_INITIAL_DATA": initial, "SHJ_WATER_PATHS": water_paths, "SHJ_WORLD_HIERARCHY": hierarchy,
    "SHJ_ORIGINAL_LIBRARY": original_library, "SHJ_SPEC_SUMMARY": spec, "SHJ_BOARD_LAYOUT": board_layout,
}
bundle = {"format": "shmap-private-bootstrap-v1", "dataVersion": "v282-r0001", "globals": globals_}
payload = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"))
digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
manifest = {
    "schemaVersion": "shmap-private-data-manifest-v1", "dataVersion": "v282-r0001", "dataPath": "production/map-data.json",
    "sha256": digest, "objectCount": len(objects), "paragraphEntryCount": len(original_library), "waterPathCount": len(water_paths),
    "generatedAt": generated_at, "sourceFile": SOURCE_DISPLAY_NAME, "minimumDesktopVersion": "1.2.0",
    "boardLayoutSchema": "v282-board-layout-1", "boardPlacementCount": len(objects), "boardOccupiedCellCount": len(occupied_cells),
    "worldLayerCounts": metadata["worldLayerCounts"], "coordinateStatusCounts": metadata["coordinateStatusCounts"],
    "migrationNote": "V282电子表格为正式地图权威来源；迁移仅保留本地博物志、图片及明确编辑字段，不允许V272基础坐标覆盖V282。",
}

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
(OUTPUT / "production").mkdir(parents=True)
(OUTPUT / "production" / "map-data.json").write_text(payload, encoding="utf-8")
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(OUTPUT / ".gitattributes").write_text("manifest.json text eol=lf\nproduction/*.json -text\n", encoding="utf-8")
(ROOT / "v282-build-report.json").write_text(json.dumps({
    "manifest": manifest, "stableOldIdsReused": sum(1 for item in objects if item["id"] in {old["id"] for old in old_objects}),
    "newIds": sum(1 for item in objects if item["id"] not in {old["id"] for old in old_objects}),
    "maxStack": max(len(items) for items in placements_by_cell.values()),
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(manifest, ensure_ascii=False, indent=2))
