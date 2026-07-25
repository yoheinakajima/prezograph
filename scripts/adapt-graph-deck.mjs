#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { assertValidDeck } from "../src/core/schema.js";

const MAX_INPUT_BYTES = 5_000_000;
const sourcePath = path.resolve(process.argv[2] ?? "");
const outputPath = path.resolve(
  process.argv[3] ?? "examples/graphs-are-awesome/reviewed.deck.json",
);

if (!process.argv[2]) {
  throw new Error("Usage: node scripts/adapt-graph-deck.mjs INPUT.json [OUTPUT.json]");
}

const sourceStats = await stat(sourcePath);
if (sourceStats.size > MAX_INPUT_BYTES) {
  throw new Error(`Input exceeds the ${MAX_INPUT_BYTES}-byte safe import limit`);
}

const legacy = JSON.parse(await readFile(sourcePath, "utf8"));
if (!legacy || typeof legacy !== "object" || !Array.isArray(legacy.slides) || !legacy.slides.length) {
  throw new Error("Legacy graph-deck input must contain a non-empty slides array");
}

const clone = (value) => structuredClone(value);
const allNodes = legacy.slides.flatMap((slide) => slide.nodes ?? []);
const nodeById = new Map();
const ownerSlideByNode = new Map();

for (const slide of legacy.slides) {
  if (!slide || typeof slide !== "object" || !Array.isArray(slide.nodes)) {
    throw new Error(`Slide ${slide?.id ?? "(unknown)"} must contain a nodes array`);
  }
  for (const node of slide.nodes) {
    if (!node?.id || !Array.isArray(node.pos) || node.pos.length !== 2) {
      throw new Error(`Slide ${slide.id} contains a node without a valid id and [x, y] position`);
    }
    if (nodeById.has(node.id)) throw new Error(`Duplicate semantic node id "${node.id}"`);
    nodeById.set(node.id, node);
    ownerSlideByNode.set(node.id, slide.id);
  }
}

const REVIEW_DATE = "2026-07-24";
const reviewedEntities = {
  co_cognee: {
    title: "Cognee",
    tip: "Active open-source memory platform for AI agents; Cognee 1.0 launched June 26, 2026.",
    source: "https://www.cognee.ai/blog/cognee-news/cognee-1-0-announcement",
    sourceDate: REVIEW_DATE,
  },
  co_graphlit: {
    title: "Graphlit",
    tip: "Historical landscape entry only. Active product operations are winding down, new signups are closed, and customer offboarding is underway.",
    source: "https://www.graphlit.com/legal/sunset",
    sourceDate: REVIEW_DATE,
  },
  co_hypermodedgrap: {
    title: "Dgraph",
    tip: "Open-source graph database stewarded by Istari Digital since October 2025.",
    source: "https://discuss.dgraph.io/t/dgraph-welcome-to-istari/20021",
    sourceDate: REVIEW_DATE,
  },
  co_metaphacts: {
    title: "metaphacts",
    tip: "Acquired by Digital Science on January 23, 2023; metaphactory remains its semantic platform.",
    source: "https://metaphacts.com/metaphacts-joins-the-digital-science-technology-group-following-acquisition",
    sourceDate: REVIEW_DATE,
  },
  co_graphwiseontot: {
    title: "Graphwise",
    tip: "The combined company formed by Ontotext and Semantic Web Company; GraphDB and PoolParty remain product lineages.",
    source: "https://graphwise.ai/blog/graphwise-merger-swc-ontotext/",
    sourceDate: REVIEW_DATE,
  },
  co_linkurious: {
    title: "Linkurious",
    tip: "Graph investigation and visualization product acquired by Nuix.",
    source: "https://www.nuix.com/news/completion-linkurious-acquisition-and-updated-full-year-acv-guidance-range",
    sourceDate: REVIEW_DATE,
  },
  co_mem0: {
    title: "Mem0",
    tip: "The company announced $24M across Seed and Series A and selection as the AWS Agent SDK memory provider.",
    source: "https://mem0.ai/series-a",
    sourceDate: REVIEW_DATE,
  },
  co_neo4j: {
    title: "Neo4j",
    tip: "Graph database and analytics company; it announced more than $200M in ARR in November 2024.",
    source: "https://neo4j.com/press-releases/neo4j-revenue-milestone-2024/",
    sourceDate: REVIEW_DATE,
  },
  co_quantexa: {
    title: "Quantexa",
    tip: "Decision-intelligence platform using entity resolution and graph analytics.",
    source: "https://www.quantexa.com/",
    sourceDate: REVIEW_DATE,
  },
  ex_reason: {
    tip: "Branch, score, and select across reasoning trees, plans, and dependency DAGs.",
  },
  ex_world: {
    tip: "State-transition and affordance graphs describe screens, actions, and changing environments.",
  },
  ex_teams: {
    tip: "Roles, messages, delegation, review, escalation, and handoffs form a collaboration graph.",
  },
  ex_tools: {
    tip: "Typed registries connect skills, dependencies, capabilities, inputs, outputs, and permissions.",
  },
  t_zep: {
    tip: "Agent memory built on Graphiti, an open-source temporal knowledge-graph engine.",
  },
  tl_op: {
    title: "Operator",
    sub: "Jan 23 2025",
    body: "Browser-acting research preview; later integrated into ChatGPT agent.",
    source: "https://openai.com/index/introducing-operator/",
    sourceDate: REVIEW_DATE,
  },
  tl_responses: {
    title: "Responses API + Agents SDK",
    sub: "Mar 11 2025",
    body: "A separate platform milestone for tool use, orchestration, tracing, and agent applications.",
    source: "https://openai.com/index/new-tools-for-building-agents/",
    sourceDate: REVIEW_DATE,
  },
  tl_a2a: {
    title: "Agent2Agent (A2A)",
    sub: "Apr 9 2025",
    body: "An open protocol for interoperable communication between agents.",
    source: "https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/",
    sourceDate: REVIEW_DATE,
  },
};

const cleanCompanyTitle = (title) => title
  .replace(/^Hypermode\s*\(Dgraph\)$/i, "Dgraph")
  .replace(/^Graphwise\s*\(Ontotext\)$/i, "Graphwise")
  .replace(/^Franz\s*\/\s*AllegroGraph$/i, "AllegroGraph");

const entities = {};
for (const node of allNodes) {
  const company = node.id.startsWith("co_");
  entities[node.id] = {
    title: company ? cleanCompanyTitle(node.title || node.id) : (node.title || node.id),
    ...(!company && node.sub ? { sub: node.sub } : {}),
    ...(!company && node.body ? { body: node.body } : {}),
    ...(node.tip ? { tip: node.tip } : {}),
    ...(reviewedEntities[node.id] ?? {}),
  };
}
entities.co_cognee = reviewedEntities.co_cognee;
entities.tl_responses = reviewedEntities.tl_responses;
entities.tl_a2a = reviewedEntities.tl_a2a;

const localPositionOverrides = {
  title: {
    co_falkordb: [-760, 585],
    co_mem0: [-400, 645],
  },
  "rows-edges": {
    oc_data: [0, -250],
    oc_order: [-330, -60],
    oc_chaos: [330, -60],
  },
  timeline: {
    ex_reason: [-900, 330],
    ex_world: [-600, 330],
    ex_know: [-300, 330],
    ex_teams: [0, 330],
    st_hub: [300, 330],
    ex_tools: [600, 330],
    ex_traces: [900, 330],
  },
  companies: {
    mk_hub: [0, -520],
    seg_db: [-570, -300],
    seg_build: [-190, -300],
    seg_mem: [350, -300],
    seg_kg: [-570, 270],
    seg_er: [0, 300],
    seg_viz: [570, 270],
    t_zep: [770, -300],
  },
};

const builtinVisual = (node) => {
  const key = node.image;
  if (!key) return undefined;
  if (key === "order-graph" || key.includes("mini-network")) return "network7";
  if (key === "chaos-lists" || key.includes("mini-table")) return "table7";
  return undefined;
};

const instanceFromNode = (node, id = node.id, pos = node.pos) => ({
  id,
  entity: node.id,
  pos: clone(pos),
  ...(node.kind ? { kind: node.kind } : {}),
  ...(node.w ? { w: node.w } : {}),
  ...(node.r ? { r: node.r } : {}),
  ...(builtinVisual(node) ? { visual: builtinVisual(node) } : {}),
});

const edgeFromLegacy = (edge, id, endpoint) => ({
  id,
  from: endpoint(edge.from),
  to: endpoint(edge.to),
  ...(edge.label ? { label: edge.label } : {}),
  ...(edge.kind ? { kind: edge.kind } : {}),
  ...(Number.isFinite(edge.curve) ? { curve: edge.curve } : {}),
});

const safeLayout = (layout = {}) => ({
  ...(Number.isFinite(layout.fitMargin) ? { fitMargin: layout.fitMargin } : {}),
  ...(Number.isFinite(layout.pushMargin) ? { pushMargin: layout.pushMargin } : {}),
  ...(Number.isFinite(layout.zoomMax) ? { zoomMax: layout.zoomMax } : {}),
  ...(Number.isFinite(layout.floatAmp) ? { floatAmp: layout.floatAmp } : {}),
  ...(typeof layout.noCard === "boolean" ? { noCard: layout.noCard } : {}),
  minReadableScale: 0.36,
});

const scenes = legacy.slides.map((slide) => {
  const ownIds = new Set(slide.nodes.map((node) => node.id));
  const included = (slide.include ?? []).filter((id) => {
    if (!nodeById.has(id)) throw new Error(`Slide ${slide.id} includes unknown node "${id}"`);
    return id !== "co_graphlit";
  });
  const includedIds = new Map(included.map((id) => [id, `${slide.id}_${id}`]));
  const endpoint = (id) => includedIds.get(id) ?? id;
  const instances = slide.nodes
    .filter((node) => node.id !== "co_graphlit")
    .map((node) => instanceFromNode(node));

  for (const semanticId of included) {
    const source = nodeById.get(semanticId);
    const pos = localPositionOverrides[slide.id]?.[semanticId] ?? source.pos;
    instances.push(instanceFromNode(source, includedIds.get(semanticId), pos));
  }

  if (slide.id === "companies") {
    const graphlit = nodeById.get("co_graphlit");
    instances.push(instanceFromNode({
      ...graphlit,
      id: "co_cognee",
      title: "Cognee",
      sub: undefined,
      body: undefined,
      tip: undefined,
    }, "co_cognee", graphlit?.pos ?? [110, -422]));
    ownIds.add("co_cognee");
  }

  const steps = new Map();
  for (const node of slide.nodes) {
    if (node.id === "co_graphlit") continue;
    steps.set(node.id, Number.isInteger(node.step) && node.step >= 0 ? node.step : 0);
  }
  for (const id of included) {
    const value = slide.includeSteps?.[id];
    steps.set(endpoint(id), Number.isInteger(value) && value >= 0 ? value : 0);
  }
  if (slide.id === "companies") steps.set("co_cognee", 0);

  const thresholds = [...new Set(steps.values())].sort((a, b) => a - b);
  const beats = thresholds.map((threshold, index) => {
    const show = [...steps.entries()].filter(([, step]) => step <= threshold).map(([id]) => id);
    const entered = [...steps.entries()].filter(([, step]) => step === threshold).map(([id]) => id);
    return {
      id: `cue_${index + 1}`,
      label: threshold === 0 ? "Opening view" : `Reveal ${threshold}`,
      show,
      focus: show,
      revealOrder: entered,
    };
  });

  const edges = (slide.edges ?? [])
    .filter((edge) => ![edge.from, edge.to].includes("co_graphlit"))
    .map((edge, index) => edgeFromLegacy(edge, `${slide.id}_edge_${index + 1}`, endpoint));

  if (slide.id === "everything" && ownIds.has("i_nrt") && ownIds.has("i_sea")) {
    edges.push({
      id: "everything_nrt_sea",
      from: "i_nrt",
      to: "i_sea",
      label: ":flight",
    });
  }
  if (slide.id === "companies") {
    edges.push({
      id: "companies_cognee",
      from: endpoint("seg_mem"),
      to: "co_cognee",
    });
  }

  return {
    id: slide.id,
    title: slide.title,
    caption: slide.id === "companies"
      ? "Selected independent graph companies · names on stage, sourced details on focus · reviewed July 24, 2026"
      : (slide.caption ?? ""),
    anchor: clone(slide.anchor),
    instances,
    edges,
    beats,
    layout: safeLayout(slide.layout),
  };
});

const timeline = scenes.find((scene) => scene.id === "timeline");
if (timeline) {
  const keep = new Set([
    "tl_hub",
    "tl_react",
    "tl_baby",
    "tl_lg",
    "tl_fc",
    "tl_mcp",
    "tl_ag",
    "tl_gr",
    "tl_op",
  ]);
  timeline.title = "Agents got graph-shaped in public";
  timeline.caption = "Reasoning, interoperability, and durable state converged in parallel";
  timeline.instances = timeline.instances
    .filter((instance) => keep.has(instance.id))
    .map((instance) => ({
      ...instance,
      pos: {
        tl_hub: [-820, -420],
        tl_react: [-600, -180],
        tl_baby: [-200, -180],
        tl_lg: [200, -180],
        tl_fc: [-600, 40],
        tl_mcp: [-200, 40],
        tl_ag: [-600, 260],
        tl_gr: [-200, 260],
        tl_op: [200, 260],
      }[instance.id],
    }));
  timeline.instances.push(
    { id: "tl_responses", entity: "tl_responses", pos: [200, 40], kind: "indigo", w: 230 },
    { id: "tl_a2a", entity: "tl_a2a", pos: [600, 40], kind: "indigo", w: 210 },
  );
  timeline.edges = [
    { id: "timeline_reason_1", from: "tl_react", to: "tl_baby", label: ":develops" },
    { id: "timeline_reason_2", from: "tl_baby", to: "tl_lg", label: ":develops" },
    { id: "timeline_tools_1", from: "tl_fc", to: "tl_mcp", label: ":opens" },
    { id: "timeline_tools_2", from: "tl_mcp", to: "tl_responses", label: ":converges" },
    { id: "timeline_tools_3", from: "tl_responses", to: "tl_a2a", label: ":interoperates" },
    { id: "timeline_state_1", from: "tl_ag", to: "tl_gr", label: ":adds_state" },
    { id: "timeline_state_2", from: "tl_gr", to: "tl_op", label: ":acts_in_world" },
    { id: "timeline_cross_1", from: "tl_lg", to: "tl_responses", label: ":converges", kind: "cross" },
    { id: "timeline_cross_2", from: "tl_mcp", to: "tl_op", label: ":enables", kind: "cross" },
  ];
  const reasoning = ["tl_hub", "tl_react", "tl_baby", "tl_lg"];
  const tools = ["tl_fc", "tl_mcp", "tl_responses", "tl_a2a"];
  const state = ["tl_ag", "tl_gr", "tl_op"];
  timeline.beats = [
    { id: "reasoning", label: "Reasoning and orchestration", show: reasoning, focus: reasoning, revealOrder: reasoning },
    {
      id: "interoperability",
      label: "Tools and interoperability",
      show: [...reasoning, ...tools],
      focus: [...reasoning, ...tools],
      revealOrder: tools,
    },
    {
      id: "state",
      label: "State, knowledge, and environment",
      show: [...reasoning, ...tools, ...state],
      focus: [...reasoning, ...tools, ...state],
      revealOrder: state,
    },
  ];
}

const companies = scenes.find((scene) => scene.id === "companies");
if (companies) {
  const representative = new Set([
    "co_neo4j",
    "co_falkordb",
    "co_puppygraph",
    "t_zep",
    "co_mem0",
    "co_cognee",
    "co_graphwiseontot",
    "co_stardog",
    "co_relationalai",
    "co_quantexa",
    "co_senzing",
    "co_tilores",
    "co_linkurious",
    "co_cambridgeintel",
    "co_graphistry",
  ]);
  companies.instances = companies.instances
    .filter((instance) =>
      representative.has(instance.entity) || ["mk_hub", "seg_db", "seg_mem", "seg_kg", "seg_er", "seg_viz"].includes(instance.entity),
    )
    .map((instance) => instance.entity === "t_zep"
      ? { ...instance, kind: "company tiny" }
      : instance);
  const remaining = new Set(companies.instances.map((instance) => instance.id));
  companies.edges = companies.edges.filter((edge) =>
    remaining.has(edge.from) && remaining.has(edge.to),
  );
  companies.caption = `${representative.size} selected independent graph companies · names on stage, sourced details on focus · reviewed July 24, 2026`;
  const stageIds = companies.instances.map((instance) => instance.id);
  companies.beats = [{
    id: "landscape",
    label: "Representative landscape",
    show: stageIds,
    focus: stageIds,
    revealOrder: stageIds,
  }];
}

const closeIndex = scenes.findIndex((scene) => scene.id === "close");
if (closeIndex >= 0) {
  const { id, title, caption, ...closeRest } = scenes[closeIndex];
  scenes[closeIndex] = {
    id,
    title,
    caption,
    overlay: {
      position: "center",
      shape: "slide",
      aspectRatio: "16:9",
      title: "(you)-[:builds]->(graphs)",
      caption: "thank you — go draw the edges",
      background: {
        type: "overviewTour",
        dim: 0.1,
        interactive: false,
      },
      tour: {
        cycles: 1,
        moveMs: 700,
        pauseMs: 500,
        endBehavior: "hold",
      },
    },
    ...closeRest,
  };
}

const allInstanceIds = new Set(scenes.flatMap((scene) => scene.instances.map((instance) => instance.id)));
const connections = (legacy.connections ?? [])
  .filter((edge) => allInstanceIds.has(edge.from) && allInstanceIds.has(edge.to))
  .map((edge, index) => edgeFromLegacy(edge, `connection_${index + 1}`, (id) => id));
const canvas = legacy.styling?.canvas ?? {};
const deck = {
  schemaVersion: "2.0",
  meta: {
    title: "Graphs Are Awesome · Reviewed graph-deck adaptation",
    author: legacy.meta?.author ?? "Yohei Nakajima",
    event: legacy.meta?.event ?? "GraphCon",
    date: legacy.meta?.date ?? "July 25, 2026",
    asOf: REVIEW_DATE,
    repository: "https://github.com/yoheinakajima/prezograph",
    source: "Adapted from the supplied graph-deck JSON; raw HTML assets removed",
  },
  theme: {
    colors: {
      background: canvas.background ?? "#fcfbf7",
      surface: "#ffffff",
      ink: canvas.ink ?? "#1d1f23",
      muted: canvas.gray ?? "#62666f",
      light: canvas.lgray ?? "#6f747c",
      hair: canvas.hair ?? "#ddd8cb",
      indigo: "#574ce3",
      green: "#47751f",
      tan: "#80551d",
    },
  },
  entities,
  scenes,
  connections,
};

assertValidDeck(deck);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(deck, null, 2)}\n`);
console.log(`Adapted ${sourcePath}`);
console.log(`Wrote ${outputPath}`);
console.log(
  `${Object.keys(deck.entities).length} entities · ${deck.scenes.length} scenes · ${deck.scenes.reduce((sum, scene) => sum + scene.instances.length, 0)} instances`,
);
