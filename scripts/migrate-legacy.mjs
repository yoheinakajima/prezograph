#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.resolve(
  process.argv[2] || "/Users/yoheinakajima/Downloads/graph-deck_1.html",
);
const outputPath = path.resolve(
  process.argv[3] || path.join(projectRoot, "examples/graphs-are-awesome/deck.json"),
);
const archivePath = path.join(projectRoot, "legacy/graph-deck_1.html");

const source = await readFile(sourcePath, "utf8");
const match = source.match(/const\s+EMBEDDED_DECK\s*=\s*(\{[\s\S]*?\});\s*\n/);
if (!match) {
  throw new Error(`Could not find EMBEDDED_DECK in ${sourcePath}`);
}

const legacy = JSON.parse(match[1]);
const clone = (value) => structuredClone(value);
const byId = (items, id) => items.find((item) => item.id === id);

const allLegacyNodes = legacy.slides.flatMap((slide) => slide.nodes || []);
const entities = {};
for (const node of allLegacyNodes) {
  if (entities[node.id]) continue;
  entities[node.id] = {
    title: node.title || node.id,
    ...(node.sub ? { sub: node.sub } : {}),
    ...(node.body ? { body: node.body } : {}),
    ...(node.tip ? { tip: node.tip } : {}),
  };
}

const legacyVisual = (image) => {
  if (!image) return undefined;
  if (image.includes("mini-network") || image === "order-graph") return "network7";
  if (image.includes("mini-table") || image === "chaos-lists") return "table7";
  return undefined;
};

const legacyInstance = (node) => ({
  id: node.id,
  entity: node.id,
  pos: clone(node.pos),
  ...(node.kind ? { kind: node.kind } : {}),
  ...(node.w ? { w: node.w } : {}),
  ...(node.r ? { r: node.r } : {}),
  ...(legacyVisual(node.image) ? { visual: legacyVisual(node.image) } : {}),
});

const legacySceneNodes = (slide) => (slide.nodes || []).map(legacyInstance);
const legacyEdges = legacy.slides.flatMap((slide) =>
  (slide.edges || []).map((edge, index) => ({
    id: edge.id || `${slide.id}_edge_${index + 1}`,
    from: edge.from,
    to: edge.to,
    ...(edge.label ? { label: edge.label } : {}),
    ...(edge.kind ? { kind: edge.kind } : {}),
  })),
);

const edgeSubset = (ids) => {
  const set = new Set(ids);
  return legacyEdges.filter((edge) => set.has(edge.from) && set.has(edge.to));
};

const sourceRef = (url, date) => ({ source: url, sourceDate: date });
const beat = (id, label, show, focus = show, revealOrder = []) => ({
  id,
  label,
  show,
  focus,
  ...(revealOrder.length ? { revealOrder } : {}),
});
const inst = (id, entity, pos, extras = {}) => ({ id, entity, pos, ...extras });
const edge = (id, from, to, label, kind) => ({
  id,
  from,
  to,
  ...(label ? { label } : {}),
  ...(kind ? { kind } : {}),
});

Object.assign(entities, {
  t_hub: {
    ...entities.t_hub,
    body: "An interactive presentation whose structure, sequence, and camera are all generated from JSON.",
  },
  t_speaker: {
    ...entities.t_speaker,
    body: "Founder, Untapped Capital · creator of BabyAGI and Prezograph",
  },
  tl_react: {
    ...entities.tl_react,
    ...sourceRef("https://arxiv.org/abs/2210.03629", "2026-07-24"),
  },
  tl_fc: {
    ...entities.tl_fc,
    ...sourceRef(
      "https://openai.com/index/function-calling-and-other-api-updates/",
      "2026-07-24",
    ),
  },
  tl_gr: {
    ...entities.tl_gr,
    ...sourceRef(
      "https://www.microsoft.com/en-us/research/blog/graphrag-new-tool-for-complex-data-discovery-now-on-github/",
      "2026-07-24",
    ),
  },
  tl_mcp: {
    ...entities.tl_mcp,
    ...sourceRef("https://www.anthropic.com/news/model-context-protocol", "2026-07-24"),
  },
  co_falkordb: {
    ...entities.co_falkordb,
    sub: "Untapped portfolio ◈",
    body: "Graph database for low-latency knowledge and agent workloads.",
    ...sourceRef("https://www.falkordb.com/", "2026-07-24"),
  },
  co_mem0: {
    ...entities.co_mem0,
    sub: "$24M raised · Agent Fund portfolio ◈",
    body: "Long-term memory layer for AI agents; an AWS Agent SDK memory provider.",
    tip: "$24M total funding announced in 2025; available as an AWS Agent SDK memory provider.",
    ...sourceRef("https://mem0.ai/series-a", "2026-07-24"),
  },
  co_neo4j: {
    ...entities.co_neo4j,
    sub: "Graph database + graph analytics",
    ...sourceRef("https://neo4j.com/company/", "2026-07-24"),
  },
  co_tigergraph: {
    ...entities.co_tigergraph,
    sub: "Enterprise graph analytics",
    ...sourceRef("https://www.tigergraph.com/company/", "2026-07-24"),
  },
  co_diffbot: {
    ...entities.co_diffbot,
    sub: "10B+ entity public-web knowledge graph",
    ...sourceRef(
      "https://docs.diffbot.com/docs/getting-started-with-diffbot-knowledge-graph",
      "2026-07-24",
    ),
  },
  co_relationalai: {
    ...entities.co_relationalai,
    sub: "$122M raised · relational knowledge graph system",
    ...sourceRef(
      "https://www.relational.ai/post/relationalai-raises-usd122m-to-redefine-how-intelligent-data-apps-are-built",
      "2026-07-24",
    ),
  },
  co_quantexa: {
    ...entities.co_quantexa,
    sub: "Decision intelligence + entity resolution",
    ...sourceRef("https://www.quantexa.com/", "2026-07-24"),
  },
  co_senzing: {
    ...entities.co_senzing,
    sub: "Entity resolution engine",
    ...sourceRef("https://senzing.com/", "2026-07-24"),
  },
  oc_hub: {
    ...entities.oc_hub,
    title: "Same facts. Different relationship cost.",
    sub: "The data model changes which questions are cheap to ask.",
  },
  oc_order: {
    ...entities.oc_order,
    title: "Graph-native",
    sub: "Relationships are first-class",
    body: "Multi-hop questions stay close to the way the problem is described.",
  },
  oc_chaos: {
    ...entities.oc_chaos,
    title: "Relational",
    sub: "Relationships are reconstructed",
    body: "Joins are powerful, but relationship-heavy questions often require more modeling and query work.",
  },
  oc_data: {
    ...entities.oc_data,
    title: "The same seven facts",
    sub: "Two representations",
  },
  tl_hub: {
    ...entities.tl_hub,
    title: "Agents became graph-shaped in public",
    sub: "2022 → 2026",
    body: "Plans, tool calls, memory, teams, interoperability, and reusable skills all made relationships explicit.",
  },
  tl_ag: {
    ...entities.tl_ag,
    title: "AutoGen + Assistants API",
    sub: "2023 · teams + threaded state",
    body: "Agent teams and persistent threads made conversational state and delegation explicit. The Assistants API is now deprecated.",
    ...sourceRef("https://help.openai.com/en/articles/8550641-assistants-", "2026-07-24"),
  },
  tl_op: {
    ...entities.tl_op,
    title: "Operator → ChatGPT agent",
    sub: "2025 · UI actions",
    body: "Operator introduced browser-acting research preview capabilities later integrated into ChatGPT agent.",
    ...sourceRef("https://openai.com/index/introducing-operator/", "2026-07-24"),
  },
  inv_ont_old: {
    ...entities.inv_ont_old,
    title: "Model-first ontology",
    sub: "Define before observing use",
    body: "Useful when the domain is stable, but expensive when behavior changes faster than the model.",
  },
  inv_ont_new: {
    ...entities.inv_ont_new,
    title: "Living ontology",
    sub: "Proposed from use · reviewed by people",
    body: "Let repeated behavior suggest structure, then validate, govern, and version it.",
  },
  st_before: {
    ...entities.st_before,
    title: "The old job",
    body: "Model the world before usage.",
  },
  st_after: {
    ...entities.st_after,
    title: "The new job",
    body: "Continuously answer five relationship questions as usage evolves.",
  },
  mk_hub: {
    ...entities.mk_hub,
    title: "A market forms around the questions",
    sub: "Infrastructure layers + relationship workloads",
  },
  ex_reason: {
    ...entities.ex_reason,
    tip: "A plan can be modeled as tasks with dependency and prerequisite edges.",
  },
  ex_world: {
    ...entities.ex_world,
    tip: "UI elements and actions form a changing graph of affordances.",
  },
  ex_teams: {
    ...entities.ex_teams,
    tip: "Delegation, review, escalation, and handoffs are relationships between agents and work.",
  },
  ex_tools: {
    ...entities.ex_tools,
    tip: "Tools expose capabilities, permissions, inputs, outputs, and dependencies.",
  },
  ex_build: {
    ...entities.ex_build,
    title: "Pick one relationship-shaped problem",
    sub: "Build the smallest useful graph",
  },
  ex_beat: {
    ...entities.ex_beat,
    title: "Open frontier",
    sub: "Useful structure beats maximal structure",
  },
  co_graphwise: {
    ...entities.co_graphwise,
    title: "Graphwise",
    sub: "Ontotext + Semantic Web Company",
    body: "Formed from the merger of Ontotext and Semantic Web Company.",
    ...sourceRef(
      "https://graphwise.ai/wp-content/uploads/2024/10/Graphwise-press-release-General.pdf",
      "2026-07-24",
    ),
  },
  co_graphwiseontot: {
    ...entities.co_graphwiseontot,
    title: "Graphwise",
    sub: "Ontotext + Semantic Web Company",
    body: "Formed from the merger of Ontotext and Semantic Web Company.",
    ...sourceRef(
      "https://graphwise.ai/wp-content/uploads/2024/10/Graphwise-press-release-General.pdf",
      "2026-07-24",
    ),
  },
  co_metaphacts: {
    ...entities.co_metaphacts,
    sub: "Acquired by Digital Science · Jan 2023",
    ...sourceRef(
      "https://metaphacts.com/images/PDFs/PR-metaphacts-joins-the-Digital-Science-technology-group-following-acquisition_final.pdf",
      "2026-07-24",
    ),
  },
  co_linkurious: {
    ...entities.co_linkurious,
    sub: "Nuix / Linkurious · acquired 2026",
    ...sourceRef("https://www.nuix.com/linkurious", "2026-07-24"),
  },
});

Object.assign(entities, {
  ag_trace_hub: {
    title: "Agents leave a graph behind",
    sub: "Even when the application never calls it one",
    body: "Prompts create plans; plans invoke tools; results update memory; traces feed evaluation.",
  },
  ag_prompt: { title: "prompt", sub: "intent + context" },
  ag_plan: { title: "plan", sub: "tasks + dependencies" },
  ag_tool: { title: "tool call", sub: "capability + permission" },
  ag_result: { title: "result", sub: "observation + artifact" },
  ag_memory: { title: "memory", sub: "state across time" },
  ag_trace: { title: "trace", sub: "what actually happened" },
  ag_eval: { title: "evaluation", sub: "evidence for change" },
  tl_a2a: {
    title: "Agent2Agent (A2A)",
    sub: "2025 · agent interoperability",
    body: "An open protocol for agents to discover capabilities and collaborate across systems.",
    ...sourceRef(
      "https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/",
      "2026-07-24",
    ),
  },
  tl_skills: {
    title: "Agent Skills",
    sub: "2025 · reusable procedural knowledge",
    body: "Filesystem-based packages make instructions, scripts, and resources composable across agent tasks.",
    ...sourceRef(
      "https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills",
      "2026-07-24",
    ),
  },
  tl_aaif: {
    title: "MCP joins AAIF",
    sub: "2025 · neutral governance",
    body: "Anthropic donated MCP to the Agentic AI Foundation under the Linux Foundation.",
    ...sourceRef(
      "https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation",
      "2026-07-24",
    ),
  },
  co_neptune: {
    title: "Amazon Neptune",
    sub: "AWS managed graph platform",
    body: "Graph database and analytics services spanning operational graphs and GraphRAG workflows.",
    ...sourceRef("https://aws.amazon.com/neptune/graph-and-ai/", "2026-07-24"),
  },
  co_spanner_graph: {
    title: "Spanner Graph",
    sub: "Google Cloud graph + relational",
    body: "Property graph capabilities integrated with Spanner's relational platform.",
    ...sourceRef(
      "https://docs.cloud.google.com/spanner/docs/graph/overview",
      "2026-07-24",
    ),
  },
  oss_hub: {
    title: "This deck is a graph",
    sub: "And the tool is open source",
    body: "One JSON document defines reusable entities, visual instances, edges, scenes, and explicit narrative beats.",
  },
  oss_json: {
    title: "deck.json",
    sub: "portable source of truth",
  },
  oss_entities: { title: "entities", sub: "facts defined once" },
  oss_scenes: { title: "scenes", sub: "local visual instances" },
  oss_beats: { title: "beats", sub: "show · focus · reveal order" },
  oss_camera: { title: "camera", sub: "derived from the focused graph" },
  oss_repo: {
    title: "Prezograph",
    sub: "JSON → graph-native presentation",
    body: "Validate it, select it, present it, and export a portable single-file deck.",
    ...sourceRef("https://github.com/yoheinakajima/prezograph", "2026-07-24"),
  },
  yg_repo: {
    title: "github.com/yoheinakajima/prezograph",
    sub: "Fork it · build a graph · tell a relationship",
    ...sourceRef("https://github.com/yoheinakajima/prezograph", "2026-07-24"),
  },
});

const sceneByLegacyId = Object.fromEntries(legacy.slides.map((slide) => [slide.id, slide]));
const sceneAnchor = (id) => clone(sceneByLegacyId[id]?.anchor || [0, 0]);
const sceneLayout = (id, extra = {}) => ({
  fitMargin: sceneByLegacyId[id]?.layout?.fitMargin || 150,
  ...(sceneByLegacyId[id]?.layout?.zoomMax
    ? { zoomMax: sceneByLegacyId[id].layout.zoomMax }
    : {}),
  ...(sceneByLegacyId[id]?.layout?.floatAmp
    ? { floatAmp: sceneByLegacyId[id].layout.floatAmp }
    : {}),
  minReadableScale: 0.48,
  ...extra,
});

const titleBase = legacySceneNodes(sceneByLegacyId.title);
const titleById = Object.fromEntries(titleBase.map((item) => [item.id, item]));
const titleFalkor = inst(
  "title_falkordb",
  "co_falkordb",
  [titleById.n_untapped.pos[0] + 160, titleById.n_untapped.pos[1] + 145],
  { kind: "company" },
);
const titleMem0 = inst(
  "title_mem0",
  "co_mem0",
  [titleById.n_agentfund.pos[0] + 160, titleById.n_agentfund.pos[1] + 145],
  { kind: "company" },
);
const titleNodes = [...titleBase, titleFalkor, titleMem0];
const titleIds = titleNodes.map(({ id }) => id);

const orderNodes = legacySceneNodes(sceneByLegacyId["order-chaos"]);
const orderIds = orderNodes.map(({ id }) => id);

const everythingNodes = legacySceneNodes(sceneByLegacyId.everything);
const everythingIds = everythingNodes.map(({ id }) => id);
const everythingCategories = everythingIds.filter((id) => id.startsWith("ev_") && id !== "ev_hub");
const everythingExamples = everythingIds.filter((id) => id.startsWith("e_"));

const agentAnchor = sceneAnchor("rows-edges");
const [agX, agY] = [0, 0];
const agentNodes = [
  inst("ag_trace_hub", "ag_trace_hub", [agX, agY], { kind: "hub", r: 54 }),
  inst("ag_prompt", "ag_prompt", [agX - 420, agY - 210]),
  inst("ag_plan", "ag_plan", [agX - 150, agY - 250]),
  inst("ag_tool", "ag_tool", [agX + 155, agY - 210]),
  inst("ag_result", "ag_result", [agX + 420, agY - 70]),
  inst("ag_memory", "ag_memory", [agX + 315, agY + 250]),
  inst("ag_trace", "ag_trace", [agX, agY + 300]),
  inst("ag_eval", "ag_eval", [agX - 330, agY + 220]),
];
const agentIds = agentNodes.map(({ id }) => id);
const agentEdges = [
  edge("ag_e1", "ag_prompt", "ag_plan", ":prompts"),
  edge("ag_e2", "ag_plan", "ag_tool", ":invokes"),
  edge("ag_e3", "ag_tool", "ag_result", ":returns"),
  edge("ag_e4", "ag_result", "ag_memory", ":updates"),
  edge("ag_e5", "ag_result", "ag_trace", ":records"),
  edge("ag_e6", "ag_trace", "ag_eval", ":feeds"),
  edge("ag_e7", "ag_eval", "ag_plan", ":improves"),
  ...agentIds
    .filter((id) => id !== "ag_trace_hub")
    .map((id, i) => edge(`ag_spoke_${i + 1}`, "ag_trace_hub", id, undefined, "spoke")),
];

const timelineBase = legacySceneNodes(sceneByLegacyId.timeline).filter(
  (item) => item.id.startsWith("tl_"),
);
const timelineById = Object.fromEntries(timelineBase.map((item) => [item.id, item]));
const timelineY = timelineById.tl_mcp.pos[1];
const timelineNodes = [
  ...timelineBase,
  inst("tl_a2a", "tl_a2a", [timelineById.tl_mcp.pos[0] + 350, timelineY - 80]),
  inst("tl_skills", "tl_skills", [timelineById.tl_mcp.pos[0] + 680, timelineY + 105]),
  inst("tl_aaif", "tl_aaif", [timelineById.tl_mcp.pos[0] + 1010, timelineY - 75]),
];
const timelineIds = timelineNodes.map(({ id }) => id);
const timelineChain = [
  "tl_react",
  "tl_baby",
  "tl_fc",
  "tl_ag",
  "tl_lg",
  "tl_gr",
  "tl_mcp",
  "tl_op",
  "tl_a2a",
  "tl_skills",
  "tl_aaif",
];
const timelineEdges = [
  ...timelineChain.slice(1).map((id, index) =>
    edge(`timeline_${index + 1}`, timelineChain[index], id, ":next", "timeline"),
  ),
  ...timelineChain.map((id, index) =>
    edge(`timeline_spoke_${index + 1}`, "tl_hub", id, undefined, "spoke"),
  ),
];

const inversionNodes = legacySceneNodes(sceneByLegacyId.inversion);
const inversionIds = inversionNodes.map(({ id }) => id);
const oldInversion = ["inv_g_old", "inv_ont_old", "inv_ing", "inv_use_old", "inv_decay"];
const newInversion = ["inv_g_new", "inv_use_new", "inv_prop", "inv_val", "inv_ont_new"];

const jobNodes = legacySceneNodes(sceneByLegacyId.job);
const jobIds = jobNodes.map(({ id }) => id);
const jobQuestions = jobIds.filter((id) => id.startsWith("st_") && !["st_before", "st_after"].includes(id));

const marketBase = legacySceneNodes(sceneByLegacyId.market);
const marketIds = marketBase.map(({ id }) => id);
const marketSegments = marketIds.filter((id) => id.startsWith("seg_"));
const marketQuestionInstances = [
  inst("market_identity", "st_id", [byId(marketBase, "seg_er").pos[0] - 260, byId(marketBase, "seg_er").pos[1] + 180], { kind: "question" }),
  inst("market_time", "st_time", [byId(marketBase, "seg_mem").pos[0], byId(marketBase, "seg_mem").pos[1] + 220], { kind: "question" }),
  inst("market_provenance", "st_prov", [byId(marketBase, "seg_kg").pos[0] + 240, byId(marketBase, "seg_kg").pos[1] + 160], { kind: "question" }),
  inst("market_correction", "st_corr", [byId(marketBase, "seg_build").pos[0] + 230, byId(marketBase, "seg_build").pos[1] - 150], { kind: "question" }),
  inst("market_permission", "st_perm", [byId(marketBase, "seg_db").pos[0] - 220, byId(marketBase, "seg_db").pos[1] - 150], { kind: "question" }),
];
const marketAll = [...marketBase, ...marketQuestionInstances];
const marketAllIds = marketAll.map(({ id }) => id);
const marketEdges = [
  ...edgeSubset(marketIds),
  edge("market_q1", "seg_er", "market_identity", ":resolves"),
  edge("market_q2", "seg_mem", "market_time", ":remembers"),
  edge("market_q3", "seg_kg", "market_provenance", ":explains"),
  edge("market_q4", "seg_build", "market_correction", ":maintains"),
  edge("market_q5", "seg_db", "market_permission", ":governs"),
];

const companyLegacy = legacySceneNodes(sceneByLegacyId.companies).filter(
  (item) => item.id.startsWith("co_") && item.id !== "co_whyhowai",
);
const companySegmentRefs = marketBase
  .filter((item) => item.id === "mk_hub" || item.id.startsWith("seg_"))
  .map((item) =>
    inst(
      item.id === "mk_hub" ? "companies_hub" : `companies_${item.id}`,
      item.entity,
      clone(item.pos),
      { kind: item.kind || (item.id === "mk_hub" ? "hub" : "segment"), ...(item.r ? { r: item.r } : {}) },
    ),
  );
const companiesDbPos = byId(marketBase, "seg_db").pos;
const companiesMemoryPos = byId(marketBase, "seg_mem").pos;
const addedCompanies = [
  inst("companies_zep", "t_zep", [companiesMemoryPos[0] + 330, companiesMemoryPos[1] + 210], { kind: "company" }),
  inst("co_neptune", "co_neptune", [companiesDbPos[0] - 350, companiesDbPos[1] - 230], { kind: "company" }),
  inst("co_spanner_graph", "co_spanner_graph", [companiesDbPos[0] + 350, companiesDbPos[1] - 230], { kind: "company" }),
];
const companyNodes = [...companySegmentRefs, ...companyLegacy, ...addedCompanies];
const companyIds = companyNodes.map(({ id }) => id);
const companySet = new Set(companyIds);
const remapCompanyEndpoint = (id) => {
  if (id === "mk_hub") return "companies_hub";
  if (id.startsWith("seg_")) return `companies_${id}`;
  if (id === "t_zep") return "companies_zep";
  return id;
};
const companyEdges = legacyEdges
  .filter((item) => {
    const from = remapCompanyEndpoint(item.from);
    const to = remapCompanyEndpoint(item.to);
    return companySet.has(from) && companySet.has(to) && ![item.from, item.to].includes("co_whyhowai");
  })
  .map((item) => ({
    ...item,
    id: `companies_${item.id}`,
    from: remapCompanyEndpoint(item.from),
    to: remapCompanyEndpoint(item.to),
  }));
companyEdges.push(
  edge("companies_neptune_edge", "companies_seg_db", "co_neptune", ":platform"),
  edge("companies_spanner_edge", "companies_seg_db", "co_spanner_graph", ":platform"),
  edge("companies_zep_edge", "companies_seg_mem", "companies_zep", ":product"),
);
const cluster = (segment) => {
  const root = `companies_${segment}`;
  const connected = companyEdges
    .filter((item) => item.from === root || item.to === root)
    .flatMap((item) => [item.from, item.to]);
  return [...new Set(["companies_hub", root, ...connected])];
};

const mapNodes = legacySceneNodes(sceneByLegacyId.map);
const mapIds = mapNodes.map(({ id }) => id);
const mapExamples = mapIds.filter((id) => id.startsWith("b_"));
const mapFrontiers = mapIds.filter((id) => id.startsWith("s_"));
const mapBase = mapIds.filter((id) => !id.startsWith("b_") && !id.startsWith("s_"));

const [ossX, ossY] = [0, 0];
const ossNodes = [
  inst("oss_hub", "oss_hub", [ossX, ossY], { kind: "hub", r: 56 }),
  inst("oss_json", "oss_json", [ossX - 430, ossY], { visual: "jsonSnippet", w: 300 }),
  inst("oss_entities", "oss_entities", [ossX - 120, ossY - 260]),
  inst("oss_scenes", "oss_scenes", [ossX + 190, ossY - 250]),
  inst("oss_beats", "oss_beats", [ossX + 400, ossY + 20]),
  inst("oss_camera", "oss_camera", [ossX + 160, ossY + 280]),
  inst("oss_repo", "oss_repo", [ossX - 230, ossY + 280], { kind: "company", w: 270 }),
];
const ossIds = ossNodes.map(({ id }) => id);
const ossEdges = [
  edge("oss_e1", "oss_json", "oss_hub", ":loads"),
  edge("oss_e2", "oss_hub", "oss_entities", ":defines"),
  edge("oss_e3", "oss_hub", "oss_scenes", ":groups"),
  edge("oss_e4", "oss_hub", "oss_beats", ":sequences"),
  edge("oss_e5", "oss_beats", "oss_camera", ":drives"),
  edge("oss_e6", "oss_repo", "oss_json", ":ships"),
];

const closeNodes = legacySceneNodes(sceneByLegacyId.close);
const closeGraphs = byId(closeNodes, "yg_graphs");
const closeRepo = inst("yg_repo", "yg_repo", [closeGraphs.pos[0], closeGraphs.pos[1] + 250], {
  kind: "company",
  w: 330,
});
const closeAll = [...closeNodes, closeRepo];
const closeIds = closeAll.map(({ id }) => id);

const scenes = [
  {
    id: "title",
    title: "Graphs Are Awesome",
    caption: "Graphs Are Awesome · Yohei Nakajima · GraphCon · July 25, 2026",
    anchor: sceneAnchor("title"),
    instances: titleNodes,
    edges: [
      ...edgeSubset(titleIds).filter((item) => !["co_falkordb", "co_mem0"].includes(item.to)),
      edge("title_portfolio_falkor", "n_untapped", "title_falkordb", ":invests"),
      edge("title_portfolio_mem0", "n_agentfund", "title_mem0", ":invests"),
    ],
    beats: [
      beat("identity", "Identity", ["t_hub", "t_speaker", "t_conf"]),
      beat("invest", "Investor", ["t_hub", "t_speaker", "t_conf", "n_invest"]),
      beat("build", "Builder", ["t_hub", "t_speaker", "t_conf", "n_invest", "n_build"]),
      beat(
        "portfolio",
        "Portfolio",
        titleIds,
        ["n_untapped", "n_agentfund", "title_falkordb", "title_mem0"],
        ["n_untapped", "title_falkordb", "n_agentfund", "title_mem0"],
      ),
    ],
    layout: sceneLayout("title", { fitMargin: 200 }),
  },
  {
    id: "same-facts",
    title: "Same facts, different relationship cost",
    caption: "The claim is not that tables are bad. It is that relationship-heavy questions reward relationship-first models.",
    anchor: sceneAnchor("order-chaos"),
    instances: orderNodes,
    edges: edgeSubset(orderIds),
    beats: [
      beat("facts", "Same facts", ["oc_data"]),
      beat("representations", "Two representations", orderIds, ["oc_order", "oc_chaos"], ["oc_order", "oc_chaos"]),
    ],
    layout: sceneLayout("order-chaos"),
  },
  {
    id: "everything",
    title: "Everything is already a graph",
    caption: "Objects matter; the relationships between them are where systems start to explain themselves.",
    anchor: sceneAnchor("everything"),
    instances: everythingNodes,
    edges: edgeSubset(everythingIds),
    beats: [
      beat("domains", "Domains", ["ev_hub", ...everythingCategories]),
      beat("examples", "Examples", everythingIds, everythingIds, everythingExamples),
    ],
    layout: sceneLayout("everything"),
  },
  {
    id: "agent-exhaust",
    title: "Agents leave a graph behind",
    caption: "The graph is present in the trace whether or not the application persists it as a graph.",
    anchor: agentAnchor,
    instances: agentNodes,
    edges: agentEdges,
    beats: [
      beat("intent", "Intent", ["ag_trace_hub", "ag_prompt"]),
      beat("execution", "Execution", ["ag_trace_hub", "ag_prompt", "ag_plan", "ag_tool", "ag_result"], ["ag_prompt", "ag_plan", "ag_tool", "ag_result"], ["ag_plan", "ag_tool", "ag_result"]),
      beat("learning", "Learning loop", agentIds, ["ag_memory", "ag_trace", "ag_eval"], ["ag_memory", "ag_trace", "ag_eval"]),
    ],
    layout: sceneLayout("rows-edges"),
  },
  {
    id: "timeline",
    title: "Agents became graph-shaped in public",
    caption: "Selected milestones, not an exhaustive history. Product names and statuses are current as of July 24, 2026.",
    anchor: sceneAnchor("timeline"),
    instances: timelineNodes,
    edges: timelineEdges,
    beats: [
      beat("year_2022", "2022", ["tl_hub", "tl_react"]),
      beat("year_2023", "2023", ["tl_hub", "tl_react", "tl_baby", "tl_fc", "tl_ag"], ["tl_baby", "tl_fc", "tl_ag"], ["tl_baby", "tl_fc", "tl_ag"]),
      beat("year_2024", "2024", ["tl_hub", "tl_react", "tl_baby", "tl_fc", "tl_ag", "tl_lg", "tl_gr", "tl_mcp"], ["tl_lg", "tl_gr", "tl_mcp"], ["tl_lg", "tl_gr", "tl_mcp"]),
      beat("year_2025", "2025", timelineIds.filter((id) => !["tl_skills", "tl_aaif"].includes(id)), ["tl_op", "tl_a2a"], ["tl_op", "tl_a2a"]),
      beat("year_2026", "2026 view", timelineIds, ["tl_skills", "tl_aaif"], ["tl_skills", "tl_aaif"]),
    ],
    layout: sceneLayout("timeline", { fitMargin: 200 }),
  },
  {
    id: "inversion",
    title: "Invert the ontology workflow",
    caption: "A model-first ontology is still valuable in stable domains. The inversion is useful when observed behavior changes faster than the model.",
    anchor: sceneAnchor("inversion"),
    instances: inversionNodes,
    edges: edgeSubset(inversionIds),
    beats: [
      beat("model-first", "Model first", oldInversion, oldInversion),
      beat("observe", "Observe use", [...oldInversion, ...newInversion.slice(0, 4)], newInversion.slice(0, 4), newInversion.slice(0, 4)),
      beat("govern", "Govern the living model", inversionIds, ["inv_val", "inv_ont_new"], ["inv_ont_new"]),
    ],
    layout: sceneLayout("inversion"),
  },
  {
    id: "new-job",
    title: "The new job is continuous relationship governance",
    caption: "Five durable questions turn a changing graph into a usable system.",
    anchor: sceneAnchor("job"),
    instances: jobNodes,
    edges: edgeSubset(jobIds),
    beats: [
      beat("before", "Before", ["st_before"]),
      beat("after", "After", ["st_after"]),
      beat("questions", "Five questions", jobIds, jobQuestions, jobQuestions),
    ],
    layout: sceneLayout("job"),
  },
  {
    id: "market",
    title: "A market forms around the questions",
    caption: "Market segments monetize infrastructure layers and recurring relationship workloads; the mapping is illustrative, not exclusive.",
    anchor: sceneAnchor("market"),
    instances: marketAll,
    edges: marketEdges,
    beats: [
      beat("layers", "Infrastructure layers", ["mk_hub", ...marketSegments]),
      beat("workloads", "Relationship workloads", marketAllIds, marketQuestionInstances.map(({ id }) => id), marketQuestionInstances.map(({ id }) => id)),
    ],
    layout: sceneLayout("market", { fitMargin: 180 }),
  },
  {
    id: "companies",
    title: "The company landscape",
    caption: "Illustrative landscape as of July 24, 2026. ◈ marks the speaker's disclosed portfolio; platform products are included alongside independent vendors.",
    anchor: sceneAnchor("companies"),
    instances: companyNodes,
    edges: companyEdges,
    beats: [
      beat("databases", "Graph databases", cluster("seg_db"), cluster("seg_db").filter((id) => id !== "companies_hub")),
      beat("construction", "Graph construction", cluster("seg_build"), cluster("seg_build").filter((id) => id !== "companies_hub")),
      beat("memory", "Agent memory", cluster("seg_mem"), cluster("seg_mem").filter((id) => id !== "companies_hub")),
      beat("semantic", "Semantic layer", cluster("seg_kg"), cluster("seg_kg").filter((id) => id !== "companies_hub")),
      beat("resolution", "Entity resolution", cluster("seg_er"), cluster("seg_er").filter((id) => id !== "companies_hub")),
      beat("visualization", "Visualization", cluster("seg_viz"), cluster("seg_viz").filter((id) => id !== "companies_hub")),
      beat("landscape", "Whole landscape", companyIds, companyIds),
    ],
    layout: sceneLayout("companies", { fitMargin: 210, minReadableScale: 0.42 }),
  },
  {
    id: "map",
    title: "Pick a relationship-shaped problem",
    caption: "Start with one consequential relationship, make it inspectable, then widen only when the use case demands it.",
    anchor: sceneAnchor("map"),
    instances: mapNodes,
    edges: edgeSubset(mapIds),
    beats: [
      beat("map", "Map the space", mapBase),
      beat("build", "Build one", [...mapBase, ...mapExamples], mapExamples, mapExamples),
      beat("frontier", "Open frontier", mapIds, mapFrontiers, mapFrontiers),
    ],
    layout: sceneLayout("map"),
  },
  {
    id: "open-source",
    title: "This deck is a graph",
    caption: "Prezograph separates reusable facts from local visual instances, then uses explicit beats to control the narrative.",
    anchor: sceneAnchor("loops"),
    instances: ossNodes,
    edges: ossEdges,
    beats: [
      beat("json", "JSON source", ["oss_hub", "oss_json"]),
      beat("system", "Graph-native system", ossIds.filter((id) => id !== "oss_repo"), ["oss_entities", "oss_scenes", "oss_beats", "oss_camera"], ["oss_entities", "oss_scenes", "oss_beats", "oss_camera"]),
      beat("repo", "Open source", ossIds, ["oss_repo"], ["oss_repo"]),
    ],
    layout: sceneLayout("loops"),
  },
  {
    id: "close",
    title: "You are a graph person",
    caption: "The graph is not the decoration. It is the presentation model.",
    anchor: sceneAnchor("close"),
    instances: closeAll,
    edges: [...edgeSubset(closeIds), edge("close_repo", "yg_graphs", "yg_repo", ":fork_it")],
    beats: [beat("close", "Build yours", closeIds, closeIds, ["yg_repo"])],
    layout: sceneLayout("close", { fitMargin: 230 }),
  },
];

const allInstanceIds = new Set(scenes.flatMap((scene) => scene.instances.map(({ id }) => id)));
const connections = [
  edge("spine_01", "t_hub", "oc_data", ":reframes", "spine"),
  edge("spine_02", "oc_data", "ev_hub", ":generalizes", "spine"),
  edge("spine_03", "ev_hub", "ag_trace_hub", ":appears_in", "spine"),
  edge("spine_04", "ag_trace_hub", "tl_hub", ":becomes_visible", "spine"),
  edge("spine_05", "tl_aaif", "inv_ont_old", ":pressures", "spine"),
  edge("spine_06", "inv_ont_new", "st_after", ":creates", "spine"),
  edge("spine_07", "st_after", "mk_hub", ":funds", "spine"),
  edge("spine_08", "mk_hub", "ex_hub", ":opens", "spine"),
  edge("spine_09", "ex_hub", "oss_hub", ":demonstrated_by", "spine"),
  edge("spine_10", "oss_repo", "yg_you", ":invites", "spine"),
  edge("loop_close", "yg_graphs", "t_hub", ":loops_to", "spine"),
  edge("cross_baby", "y_babyagi", "tl_baby", ":appears_on_timeline", "cross"),
  edge("cross_time", "y_active", "st_time", ":raises_question", "cross"),
  edge("cross_correction", "st_corr", "inv_val", ":requires", "cross"),
  edge("cross_provenance", "st_prov", "ev_beliefs", ":grounds", "cross"),
].filter((item) => allInstanceIds.has(item.from) && allInstanceIds.has(item.to));

const usedEntityIds = new Set(
  scenes.flatMap((scene) => scene.instances.map((instance) => instance.entity)),
);
const usedEntities = Object.fromEntries(
  Object.entries(entities).filter(([id]) => usedEntityIds.has(id)),
);

const deck = {
  schemaVersion: "2.0",
  meta: {
    title: "Graphs Are Awesome",
    author: "Yohei Nakajima",
    event: "GraphCon",
    date: "July 25, 2026",
    presentedDate: "2026-07-25",
    reviewedDate: "2026-07-24",
    repository: "https://github.com/yoheinakajima/prezograph",
    disclosure: "FalkorDB is an Untapped Capital portfolio company. Mem0 is an Agent Fund portfolio company.",
    source: "Migrated from graph-deck_1.html",
  },
  theme: {
    colors: {
      background: "#f4f0e8",
      surface: "#fffdf8",
      ink: "#14211c",
      muted: "#52655c",
      light: "#65766e",
      hair: "#cfc9bb",
      indigo: "#4f46c8",
      green: "#17714d",
      tan: "#8a4b10",
    },
  },
  entities: usedEntities,
  scenes,
  connections,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(archivePath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(deck, null, 2)}\n`);
if (path.resolve(sourcePath) !== path.resolve(archivePath)) {
  await copyFile(sourcePath, archivePath);
}

console.log(`Migrated ${sourcePath}`);
console.log(`Wrote ${outputPath}`);
console.log(`Archived original at ${archivePath}`);
console.log(
  `${Object.keys(usedEntities).length} entities · ${scenes.length} scenes · ${scenes.reduce(
    (sum, scene) => sum + scene.instances.length,
    0,
  )} instances`,
);
