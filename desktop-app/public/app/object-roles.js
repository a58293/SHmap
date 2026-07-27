(() => {
  "use strict";

  const selectors = (rows) => rows.map(([rowRefSnapshot, name, chapter = ""]) => ({
    rowRefSnapshot,
    name,
    chapter,
  }));

  const definitions = [
    {
      semanticKey: "hai-nei-jing:jiu-qiu:collection",
      rowRefSnapshot: "R11",
      name: "九丘",
      chapter: "海内经",
      mapRole: "collection",
      roleLabel: "丘群集合",
      note: "九丘是九个具名丘陵的父级集合，只保留整体范围、水络原文和成员入口，不作为第十个丘陵占用主格。",
      members: selectors([
        ["R13", "陶唐之丘", "海内经"],
        ["R14", "叔得之丘", "海内经"],
        ["R15", "孟盈之丘", "海内经"],
        ["R16", "昆吾之丘", "海内经"],
        ["R17", "黑白之丘", "海内经"],
        ["R18", "赤望之丘", "海内经"],
        ["R19", "参卫之丘", "海内经"],
        ["R20", "武夫之丘", "海内经"],
        ["R21", "神民之丘", "海内经"],
      ]),
    },
    {
      semanticKey: "hai-nei-jing:jiu-qiu:water-network",
      rowRefSnapshot: "R12",
      name: "水",
      chapter: "海内经",
      mapRole: "path",
      roleLabel: "九丘水络",
      note: "“以水络之”的未名水网只保留线型几何，不生成独立地块卡片。",
      parent: { rowRefSnapshot: "R11", name: "九丘", chapter: "海内经" },
    },
    {
      semanticKey: "hai-nei-bei-jing:four-imperial-terraces",
      rowRefSnapshot: "R60",
      name: "帝尧台、帝喾台、帝丹朱台、帝舜台",
      chapter: "海内北经",
      mapRole: "collection",
      roleLabel: "帝台集合",
      note: "该记录是四个具名帝台的总入口；R61—R64成员继续各自显示，集合本身不再额外占格。",
      members: selectors([
        ["R61", "帝尧台", "海内北经"],
        ["R62", "帝喾台", "海内北经"],
        ["R63", "帝丹朱台", "海内北经"],
        ["R64", "帝舜台", "海内北经"],
      ]),
    },
    {
      semanticKey: "hai-nei-xi-jing:kunlun:nine-wells",
      rowRefSnapshot: "R67",
      name: "昆仑九井",
      chapter: "海内西经",
      mapRole: "detail",
      roleLabel: "内部设施",
      note: "昆仑内部的九井设施集合，进入昆仑档案，不在昆仑之外另建地块。",
      parent: { rowRefSnapshot: "R44", name: "海内昆仑之虚", chapter: "海内西经" },
      virtualMembers: ["九井（原文未分别命名）"],
    },
    {
      semanticKey: "hai-nei-xi-jing:kunlun:nine-gates",
      rowRefSnapshot: "R68",
      name: "昆仑九门",
      chapter: "海内西经",
      mapRole: "detail",
      roleLabel: "内部设施",
      note: "昆仑内部的九门入口系统，进入昆仑档案；原文未给出九个独立坐标。",
      parent: { rowRefSnapshot: "R44", name: "海内昆仑之虚", chapter: "海内西经" },
      virtualMembers: ["九门（原文未分别命名）"],
    },
    ...[
      ["R71", "开明西", "昆仑西部子区域"],
      ["R72", "开明北", "昆仑北部子区域"],
      ["R73", "开明东", "昆仑东部子区域"],
      ["R74", "开明南", "昆仑南部子区域"],
    ].map(([rowRefSnapshot, name, roleLabel]) => ({
      semanticKey: `hai-nei-xi-jing:kunlun:${name}`,
      rowRefSnapshot,
      name,
      chapter: "海内西经",
      mapRole: "subregion",
      roleLabel,
      note: "昆仑主体内部的方位子区，只在所属主体档案中说明，不进入全局独立地块计数。",
      parent: { rowRefSnapshot: "R44", name: "海内昆仑之虚", chapter: "海内西经" },
    })),
    ...["R92", "R93", "R94"].map((rowRefSnapshot, index) => ({
      semanticKey: `hai-nei-xi-jing:yang-hei-shared-path:${index + 1}`,
      rowRefSnapshot,
      name: "洋水、黑水",
      chapter: "海内西经",
      mapRole: "path",
      roleLabel: "共线路径",
      note: "洋水与黑水的共享路径记录，只绘制线路，同时关联两条独立河流。",
      related: selectors([
        ["R47", "洋水", "海内西经"],
        ["R48", "黑水", "海内西经"],
      ]),
    })),
    ...["R102", "R103", "R104"].map((rowRefSnapshot, index) => ({
      semanticKey: `hai-nei-xi-jing:ruo-qing-shared-path:${index + 1}`,
      rowRefSnapshot,
      name: "弱水、青水",
      chapter: "海内西经",
      mapRole: "path",
      roleLabel: "共线路径",
      note: "弱水与青水的共享路径记录，只绘制线路，同时关联两条独立河流。",
      related: selectors([
        ["R49", "弱水", "海内西经"],
        ["R50", "青水", "海内西经"],
      ]),
    })),
    {
      semanticKey: "hai-nei-jing:du-guang:ecology-layer",
      rowRefSnapshot: "R140",
      name: "都广之野",
      chapter: "海内经",
      mapRole: "detail",
      roleLabel: "生态资料层",
      note: "该记录是都广之野的丰饶生态说明层，内容归入主体档案，不作为第二个都广之野占格。",
      parent: { rowRefSnapshot: "R9", name: "都广之野", chapter: "海内经" },
    },
    ...[
      ["R141", "南海之内", "海域上下文"],
      ["R147", "东海之内", "海域上下文"],
      ["R151", "西海之内", "海域上下文"],
      ["R154", "流沙之西", "相对方位"],
      ["R169", "南方", "章节方位"],
      ["R181", "北海之内", "海域上下文"],
    ].map(([rowRefSnapshot, name, roleLabel]) => ({
      semanticKey: `hai-nei-jing:context:${name}`,
      rowRefSnapshot,
      name,
      chapter: "海内经",
      mapRole: "context",
      roleLabel,
      note: "原文中的范围或相对方位词，作为经篇与区域上下文保留，不生成独立地块卡片。",
    })),
    {
      semanticKey: "hai-nei-jing:niao-shan:three-waters",
      rowRefSnapshot: "R157",
      name: "三水",
      chapter: "海内经",
      mapRole: "path",
      roleLabel: "三源水系",
      note: "鸟山所出的三条未具名水流，以水系集合／路径层显示，不把“三水”视为单一具名地块。",
      parent: { rowRefSnapshot: "R156", name: "鸟山", chapter: "海内经" },
      virtualMembers: ["三条未具名源流"],
    },
    {
      semanticKey: "hai-nei-jing:you-du:five-dark-animals",
      rowRefSnapshot: "R196",
      name: "玄鸟、玄蛇、玄豹、玄虎、玄狐蓬尾",
      chapter: "海内经",
      mapRole: "detail",
      roleLabel: "鸟兽条目集合",
      note: "五种动物属于幽都之山内部博物志，不作为一块名为五兽并列串的地块。",
      parent: { rowRefSnapshot: "R56", name: "幽都之山", chapter: "海内经" },
      virtualMembers: ["玄鸟", "玄蛇", "玄豹", "玄虎", "玄狐蓬尾"],
    },
    {
      semanticKey: "hai-nei-dong-jing:min-three-rivers",
      rowRefSnapshot: "R272",
      name: "岷三江",
      chapter: "海内东经",
      mapRole: "collection",
      roleLabel: "水系集合",
      note: "岷三江是大江、北江、南江的系统入口，保留总水系线路和成员导航，不计作第四条独立河流。",
      members: selectors([
        ["R273", "大江", "海内东经"],
        ["R275", "北江", "海内东经"],
        ["R277", "南江", "海内东经"],
      ]),
    },
    {
      semanticKey: "da-huang-dong-jing:two-imperial-altars",
      rowRefSnapshot: "R403",
      name: "帝下两坛",
      chapter: "大荒东经",
      mapRole: "collection",
      roleLabel: "祭坛集合",
      note: "原文只说明帝下有两坛，未分别命名或给出位置；作为事件模块中的双坛集合显示，不虚构两个坐标。",
      virtualMembers: ["帝下之坛一（未具名）", "帝下之坛二（未具名）"],
    },
  ];

  const normalize = (value) => String(value || "")
    .replace(/[《》\s·／/、，,；;（）()【】\[\]：:.-]/g, "")
    .toLowerCase();

  function selectorMatches(object, selector) {
    if (!object || !selector) return false;
    const nameMatches = normalize(object.name) === normalize(selector.name);
    const chapterMatches = !selector.chapter || normalize(object.chapter).includes(normalize(selector.chapter));
    return nameMatches && chapterMatches;
  }

  function locateDefinitionObject(objects, definition) {
    const bySnapshot = objects.filter((object) =>
      object.rowRef === definition.rowRefSnapshot && selectorMatches(object, definition));
    if (bySnapshot.length === 1) return bySnapshot[0];
    const semantic = objects.filter((object) => selectorMatches(object, definition));
    return semantic.length === 1 ? semantic[0] : null;
  }

  function apply(objects) {
    const source = Array.isArray(objects) ? objects : [];
    const clean = source.map((object) => ({
      ...object,
      mapRole: "entity",
      roleLabel: "独立地图对象",
      tileVisible: true,
      roleSchemaVersion: "1.0",
    }));
    const byId = new Map(clean.map((object) => [object.id, object]));

    definitions.forEach((definition) => {
      const target = locateDefinitionObject(clean, definition);
      if (!target) return;
      byId.set(target.id, {
        ...target,
        mapRole: definition.mapRole,
        roleLabel: definition.roleLabel,
        semanticKey: definition.semanticKey,
        tileVisible: false,
        roleNote: definition.note,
        roleParentSelector: definition.parent || null,
        roleMemberSelectors: definition.members || [],
        roleRelatedSelectors: definition.related || [],
        roleVirtualMembers: definition.virtualMembers || [],
        roleSchemaVersion: "1.0",
      });
    });

    return clean.map((object) => byId.get(object.id) || object);
  }

  window.SHJ_OBJECT_ROLE_MANIFEST = Object.freeze({
    schemaVersion: "1.0",
    release: "0.7.7",
    definitions: Object.freeze(definitions),
    apply,
    selectorMatches,
  });
})();
