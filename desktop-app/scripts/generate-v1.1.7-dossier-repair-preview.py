import argparse
import copy
import csv
import hashlib
import json
import os
import sqlite3
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


def row_number(item):
    value = str(item.get("rowRef", ""))
    return int(value[1:]) if value.startswith("R") and value[1:].isdigit() else None


def source_subject(item):
    dossier = item.get("dossier")
    if not isinstance(dossier, dict):
        return "", ""
    source_file = str(dossier.get("sourceFile", "")).strip()
    stem = os.path.splitext(os.path.basename(source_file))[0]
    return source_file, stem.split("__")[-1].strip()


def official_rank(item):
    object_id = str(item.get("id", ""))
    return (0 if object_id.startswith("SHJ-OBJ-000") else 1, object_id)


def make_change(entity_id, operation, label, before, after, summary, index, created_at):
    return {
        "entityId": entity_id,
        "operation": operation,
        "operationLabel": label,
        "before": before,
        "after": after,
        "summary": summary,
        "changeId": f"REPAIR-V117-{index:04d}",
        "createdAt": created_at,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate a dry-run dossier alignment repair package")
    parser.add_argument("--db", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    db_path = Path(args.db)
    connection = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    row = connection.execute(
        "SELECT updated_at, payload_sha256, payload FROM current_workspace WHERE singleton_id=1"
    ).fetchone()
    if not row:
        raise SystemExit("current_workspace is empty")
    database_updated_at, database_hash, payload = row
    workspace = json.loads(payload)
    objects = workspace.get("objects", [])
    by_name = defaultdict(list)
    by_row = defaultdict(list)
    by_id = {}
    for item in objects:
        by_name[str(item.get("name", "")).strip()].append(item)
        by_row[str(item.get("rowRef", ""))].append(item)
        by_id[str(item.get("id", ""))] = item

    proposed = []
    unresolved = []
    for source in objects:
        source_file, subject = source_subject(source)
        if not subject:
            continue
        candidates = by_name.get(subject, [])
        if len(candidates) != 1:
            continue
        target = candidates[0]
        if target.get("id") == source.get("id"):
            continue
        source_row = row_number(source)
        target_row = row_number(target)
        if source_row is None or target_row is None:
            continue
        delta = source_row - target_row
        reason = None
        if delta == 3 and 144 <= source_row <= 406:
            reason = "连续错位链：档案比目标母表行向后偏移3行"
        elif (
            source.get("rowRef") == "R143"
            and target.get("rowRef") == "R9"
            and source.get("chapter") == target.get("chapter")
            and not target.get("dossier")
        ):
            reason = "链首遗留：都广之野档案位于朝云国，目标无档案且同经篇"
        elif (
            source.get("rowRef") == "R155"
            and target.get("rowRef") == "R142"
            and source.get("chapter") == target.get("chapter")
            and not target.get("dossier")
        ):
            reason = "链中遗留：流沙档案位于沮叶国，目标无档案且同经篇"
        if reason:
            proposed.append({
                "source": source,
                "target": target,
                "sourceFile": source_file,
                "subject": subject,
                "delta": delta,
                "reason": reason,
            })
        else:
            unresolved.append({
                "sourceId": source.get("id"),
                "sourceRow": source.get("rowRef"),
                "sourceName": source.get("name"),
                "sourceChapter": source.get("chapter"),
                "sourceFile": source_file,
                "suggestedTargetId": target.get("id"),
                "suggestedTargetRow": target.get("rowRef"),
                "suggestedTargetName": target.get("name"),
                "suggestedTargetChapter": target.get("chapter"),
                "delta": delta,
                "reason": "不符合连续+3链或安全链首条件，保持不动",
            })

    duplicate_groups = []
    for row_ref, items in by_row.items():
        if len(items) < 2:
            continue
        same_name = defaultdict(list)
        for item in items:
            same_name[str(item.get("name", ""))].append(item)
        for name, duplicates in same_name.items():
            if len(duplicates) < 2:
                continue
            ordered = sorted(duplicates, key=official_rank)
            official = ordered[0]
            extras = ordered[1:]
            if row_ref not in {"R404", "R405", "R406"}:
                unresolved.append({
                    "sourceId": ", ".join(str(item.get("id")) for item in extras),
                    "sourceRow": row_ref,
                    "sourceName": name,
                    "reason": "发现其他重复对象，不在已验证的R404-R406范围内，保持不动",
                })
                continue
            duplicate_groups.append({"rowRef": row_ref, "name": name, "official": official, "extras": extras})

    # Build every after-state from the original immutable snapshot. No operation
    # depends on an earlier operation having already run.
    corrected = {item["id"]: copy.deepcopy(item) for item in objects if item.get("id")}
    for move in proposed:
        corrected[move["target"]["id"]]["dossier"] = copy.deepcopy(move["source"]["dossier"])

    local_fields = (
        "dossier", "childHierarchy", "waterHierarchy", "images", "imageUrl",
        "imageSource", "imageCopyright", "notesLocal", "updatedAt", "createdAt",
    )
    duplicate_id_map = {}
    for group in duplicate_groups:
        official = corrected[group["official"]["id"]]
        for extra in group["extras"]:
            duplicate_id_map[extra["id"]] = official["id"]
            for key in local_fields:
                if key in extra and extra[key] not in (None, "", [], {}):
                    official[key] = copy.deepcopy(extra[key])

    created_at = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    changes = []
    index = 1
    target_ids = []
    for move in sorted(proposed, key=lambda item: row_number(item["target"]) or 999999):
        target = move["target"]
        target_ids.append(target["id"])
        changes.append(make_change(
            target["id"], "update", "修复地块档案错位",
            copy.deepcopy(target), copy.deepcopy(corrected[target["id"]]),
            f"将 {move['sourceFile']} 从 {move['source'].get('rowRef')} {move['source'].get('name')} 归位到 {target.get('rowRef')} {target.get('name')}",
            index, created_at,
        ))
        index += 1

    for group in sorted(duplicate_groups, key=lambda item: item["rowRef"]):
        official = group["official"]
        changes.append(make_change(
            official["id"], "update", "合并重复对象资料",
            copy.deepcopy(official), copy.deepcopy(corrected[official["id"]]),
            f"将重复的 {group['rowRef']} {group['name']} 档案合并回正式对象",
            index, created_at,
        ))
        index += 1
        for extra in group["extras"]:
            changes.append(make_change(
                extra["id"], "delete", "删除已合并的重复对象",
                copy.deepcopy(extra), None,
                f"删除已合并到 {official['id']} 的重复对象 {extra['id']}",
                index, created_at,
            ))
            index += 1

    package = {
        "package_type": "shjpatch",
        "package_version": "1.3",
        "base_data_version": workspace.get("dataVersion", ""),
        "created_at": created_at,
        "change_count": len(changes),
        "summary": f"数据体检修复预览：归位{len(proposed)}份地块档案，合并并删除{sum(len(item['extras']) for item in duplicate_groups)}个重复对象；不处理{len(unresolved)}条不确定异常。",
        "asset_count": 0,
        "asset_base_path": "submissions/assets",
        "repair_guard": {
            "format": "shmap-dossier-alignment-repair-v1",
            "sourceDatabaseUpdatedAt": database_updated_at,
            "sourcePayloadSha256": database_hash,
            "sourceObjectCount": len(objects),
            "proposedDossierMoves": len(proposed),
            "duplicateObjectsToRemove": sum(len(item["extras"]) for item in duplicate_groups),
            "unresolvedCount": len(unresolved),
        },
        "changes": changes,
    }

    package_path = output_dir / "SHmap_v1.1.7_档案错位与重复对象修复_预览更改包.shjpatch"
    package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2), encoding="utf-8")

    csv_path = output_dir / "SHmap_v1.1.7_档案归位逐条对照.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "sourceRow", "sourceName", "sourceId", "sourceFile", "targetRow", "targetName",
            "targetId", "chapter", "delta", "reason",
        ])
        writer.writeheader()
        for move in sorted(proposed, key=lambda item: row_number(item["target"]) or 999999):
            writer.writerow({
                "sourceRow": move["source"].get("rowRef"),
                "sourceName": move["source"].get("name"),
                "sourceId": move["source"].get("id"),
                "sourceFile": move["sourceFile"],
                "targetRow": move["target"].get("rowRef"),
                "targetName": move["target"].get("name"),
                "targetId": move["target"].get("id"),
                "chapter": move["target"].get("chapter"),
                "delta": move["delta"],
                "reason": move["reason"],
            })

    unresolved_path = output_dir / "SHmap_v1.1.7_保持不动待人工判断.json"
    unresolved_path.write_text(json.dumps(unresolved, ensure_ascii=False, indent=2), encoding="utf-8")

    report_path = output_dir / "README_先看再导入.md"
    report_path.write_text(
        "\n".join([
            "# SHmap v1.1.7 数据修复预览",
            "",
            f"- 数据库更新时间：{database_updated_at}",
            f"- 数据库工作区 SHA-256：`{database_hash}`",
            f"- 当前对象数：{len(objects)}",
            f"- 可证明应归位的档案：{len(proposed)} 份（其中连续 +3 行错位 {sum(item['delta'] == 3 for item in proposed)} 份）",
            f"- 已验证重复对象：{sum(len(item['extras']) for item in duplicate_groups)} 个（R404-R406）",
            f"- 保持不动的异常：{len(unresolved)} 条",
            f"- 更改包操作总数：{len(changes)} 项",
            "",
            "## 安全规则",
            "",
            "1. 本工具只读取数据库，生成的更改包尚未写入 SQLite。",
            "2. 导入前必须先立即备份，并确认客户端仍是同一份工作区。",
            "3. 在客户端逐项预览；若出现本机字段冲突，不要整包强行覆盖。",
            "4. `泗水.md → 白水` 等跨经篇异常保留在待人工判断文件中，没有放进修复包。",
            "5. 流沙本轮新改的名称、几何、路径和区域不在本更改包修改范围内；只归位旧 dossier 字段。",
            "",
            "## 重复对象处理",
            "",
            "R404、R405、R406 的 V125 重复对象资料会先合并回正式对象，再删除重复对象。",
            "",
        ]),
        encoding="utf-8",
    )

    digest = hashlib.sha256(package_path.read_bytes()).hexdigest()
    print(json.dumps({
        "package": str(package_path),
        "packageSha256": digest,
        "moves": len(proposed),
        "delta3Moves": sum(item["delta"] == 3 for item in proposed),
        "duplicates": sum(len(item["extras"]) for item in duplicate_groups),
        "unresolved": len(unresolved),
        "changes": len(changes),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
