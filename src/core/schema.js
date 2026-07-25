export const SCHEMA_VERSION = "2.0";

const ID_RE = /^[a-zA-Z][a-zA-Z0-9_.:-]*$/;
const KIND_RE = /^[a-z0-9]+(?: [a-z0-9]+)*$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const BUILTIN_VISUALS = new Set(["network7", "table7", "jsonSnippet"]);
const ENTITY_KEYS = new Set(["title", "sub", "body", "tip", "source", "sourceDate"]);
const INSTANCE_KEYS = new Set(["id", "entity", "pos", "kind", "w", "r", "visual"]);
const EDGE_KEYS = new Set(["id", "from", "to", "label", "kind", "curve"]);
const SCENE_KEYS = new Set(["id", "title", "caption", "anchor", "instances", "edges", "beats", "layout", "overlay"]);
const BEAT_KEYS = new Set(["id", "label", "caption", "show", "focus", "revealOrder"]);
const LAYOUT_KEYS = new Set(["fitMargin", "pushMargin", "zoomMax", "floatAmp", "minReadableScale", "noCard"]);
const OVERLAY_KEYS = new Set(["position", "shape", "aspectRatio", "title", "caption", "background", "tour"]);
const OVERLAY_BACKGROUND_KEYS = new Set(["type", "dim", "interactive"]);
const OVERLAY_TOUR_KEYS = new Set(["cycles", "moveMs", "pauseMs", "endBehavior"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class DeckValidationError extends Error {
  constructor(issues) {
    super(`Deck validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}`);
    this.name = "DeckValidationError";
    this.issues = issues;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPair(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

function add(issues, path, message) {
  issues.push({ path, message });
}

function checkId(issues, value, path) {
  if (typeof value !== "string" || !ID_RE.test(value)) {
    add(issues, path, "must be an identifier beginning with a letter");
    return false;
  }
  return true;
}

function checkIdList(issues, value, path, allowed) {
  if (!Array.isArray(value)) {
    add(issues, path, "must be an array of instance IDs");
    return;
  }
  const seen = new Set();
  value.forEach((id, index) => {
    if (typeof id !== "string" || !allowed.has(id)) add(issues, `${path}[${index}]`, `unknown instance "${id}"`);
    if (seen.has(id)) add(issues, `${path}[${index}]`, `duplicates "${id}"`);
    seen.add(id);
  });
}

export function validateDeck(deck, options = {}) {
  const issues = [];
  const maxNodes = options.maxNodes ?? 5000;
  const maxEdges = options.maxEdges ?? 12000;

  if (!isObject(deck)) return { valid: false, issues: [{ path: "$", message: "must be an object" }] };

  if (deck.schemaVersion !== SCHEMA_VERSION) {
    add(issues, "schemaVersion", `must equal "${SCHEMA_VERSION}"`);
  }
  if (!isObject(deck.meta)) add(issues, "meta", "must be an object");
  if (!isObject(deck.meta) || typeof deck.meta.title !== "string" || !deck.meta.title.trim()) {
    add(issues, "meta.title", "must be a non-empty string");
  }
  if (deck.meta?.repository && !/^https?:\/\//.test(deck.meta.repository)) {
    add(issues, "meta.repository", "must be an http(s) URL");
  }

  if (!isObject(deck.entities)) add(issues, "entities", "must be an object keyed by entity ID");
  const entityIds = new Set();
  if (isObject(deck.entities)) {
    for (const [id, entity] of Object.entries(deck.entities)) {
      checkId(issues, id, `entities.${id}`);
      if (entityIds.has(id)) add(issues, `entities.${id}`, "duplicate entity ID");
      entityIds.add(id);
      if (!isObject(entity)) {
        add(issues, `entities.${id}`, "must be an object");
        continue;
      }
      if (typeof entity.title !== "string" || !entity.title.trim()) add(issues, `entities.${id}.title`, "must be a non-empty string");
      for (const key of Object.keys(entity)) {
        if (!ENTITY_KEYS.has(key)) add(issues, `entities.${id}.${key}`, "is not an allowed entity property");
      }
      for (const key of ["sub", "body", "tip", "sourceDate"]) {
        if (entity[key] != null && typeof entity[key] !== "string") add(issues, `entities.${id}.${key}`, "must be a string");
      }
      if (entity.source && !/^https?:\/\//.test(entity.source)) add(issues, `entities.${id}.source`, "must be an http(s) URL");
      if (entity.sourceDate && !DATE_RE.test(entity.sourceDate)) add(issues, `entities.${id}.sourceDate`, "must be YYYY-MM-DD");
    }
  }

  if (!Array.isArray(deck.scenes) || deck.scenes.length === 0) add(issues, "scenes", "must be a non-empty array");
  const sceneIds = new Set();
  const instanceIds = new Set();
  const sceneInstanceIds = new Map();
  let nodeCount = 0;

  if (Array.isArray(deck.scenes)) {
    deck.scenes.forEach((scene, sceneIndex) => {
      const path = `scenes[${sceneIndex}]`;
      if (!isObject(scene)) {
        add(issues, path, "must be an object");
        return;
      }
      for (const key of Object.keys(scene)) {
        if (!SCENE_KEYS.has(key)) add(issues, `${path}.${key}`, "is not an allowed scene property");
      }
      if (checkId(issues, scene.id, `${path}.id`)) {
        if (sceneIds.has(scene.id)) add(issues, `${path}.id`, `duplicates scene "${scene.id}"`);
        sceneIds.add(scene.id);
      }
      if (typeof scene.title !== "string" || !scene.title.trim()) add(issues, `${path}.title`, "must be a non-empty string");
      if (scene.caption != null && typeof scene.caption !== "string") add(issues, `${path}.caption`, "must be a string");
      if (!isPair(scene.anchor)) add(issues, `${path}.anchor`, "must be [x, y] finite numbers");
      if (!Array.isArray(scene.instances) || scene.instances.length === 0) add(issues, `${path}.instances`, "must be a non-empty array");
      const local = new Set();
      sceneInstanceIds.set(scene.id, local);

      if (Array.isArray(scene.instances)) {
        nodeCount += scene.instances.length;
        scene.instances.forEach((instance, instanceIndex) => {
          const instancePath = `${path}.instances[${instanceIndex}]`;
          if (!isObject(instance)) {
            add(issues, instancePath, "must be an object");
            return;
          }
          if (checkId(issues, instance.id, `${instancePath}.id`)) {
            if (instanceIds.has(instance.id)) add(issues, `${instancePath}.id`, `duplicates global instance "${instance.id}"`);
            instanceIds.add(instance.id);
            local.add(instance.id);
          }
          for (const key of Object.keys(instance)) {
            if (!INSTANCE_KEYS.has(key)) add(issues, `${instancePath}.${key}`, "is not an allowed instance property");
          }
          if (!entityIds.has(instance.entity)) add(issues, `${instancePath}.entity`, `unknown entity "${instance.entity}"`);
          if (!isPair(instance.pos)) add(issues, `${instancePath}.pos`, "must be [x, y] finite numbers");
          if (instance.kind != null && (typeof instance.kind !== "string" || !KIND_RE.test(instance.kind))) {
            add(issues, `${instancePath}.kind`, "must contain lowercase space-separated style tokens");
          }
          if (instance.w != null && (!Number.isFinite(instance.w) || instance.w < 40 || instance.w > 1200)) {
            add(issues, `${instancePath}.w`, "must be between 40 and 1200");
          }
          if (instance.r != null && (!Number.isFinite(instance.r) || instance.r < 20 || instance.r > 800)) {
            add(issues, `${instancePath}.r`, "must be between 20 and 800");
          }
          if (instance.visual != null && !BUILTIN_VISUALS.has(instance.visual)) {
            add(issues, `${instancePath}.visual`, `must be one of ${[...BUILTIN_VISUALS].join(", ")}`);
          }
        });
      }

      if (scene.layout != null && !isObject(scene.layout)) add(issues, `${path}.layout`, "must be an object");
      if (isObject(scene.layout)) {
        for (const key of Object.keys(scene.layout)) {
          if (!LAYOUT_KEYS.has(key)) add(issues, `${path}.layout.${key}`, "is not an allowed layout property");
        }
      }
      for (const key of ["fitMargin", "pushMargin", "zoomMax", "floatAmp", "minReadableScale"]) {
        if (scene.layout?.[key] != null && (!Number.isFinite(scene.layout[key]) || scene.layout[key] < 0)) {
          add(issues, `${path}.layout.${key}`, "must be a non-negative finite number");
        }
      }
      if (scene.layout?.noCard != null && typeof scene.layout.noCard !== "boolean") add(issues, `${path}.layout.noCard`, "must be a boolean");

      if (scene.overlay != null && !isObject(scene.overlay)) add(issues, `${path}.overlay`, "must be an object");
      if (isObject(scene.overlay)) {
        for (const key of Object.keys(scene.overlay)) {
          if (!OVERLAY_KEYS.has(key)) add(issues, `${path}.overlay.${key}`, "is not an allowed overlay property");
        }
        if (scene.overlay.position != null && scene.overlay.position !== "center") {
          add(issues, `${path}.overlay.position`, 'must equal "center"');
        }
        if (scene.overlay.shape != null && scene.overlay.shape !== "slide") {
          add(issues, `${path}.overlay.shape`, 'must equal "slide"');
        }
        if (scene.overlay.aspectRatio != null && scene.overlay.aspectRatio !== "16:9") {
          add(issues, `${path}.overlay.aspectRatio`, 'must equal "16:9"');
        }
        for (const key of ["title", "caption"]) {
          if (scene.overlay[key] != null && typeof scene.overlay[key] !== "string") {
            add(issues, `${path}.overlay.${key}`, "must be a string");
          }
        }
        if (scene.overlay.title != null && !scene.overlay.title.trim()) {
          add(issues, `${path}.overlay.title`, "must be a non-empty string");
        }
        if (scene.overlay.background != null && !isObject(scene.overlay.background)) {
          add(issues, `${path}.overlay.background`, "must be an object");
        }
        if (isObject(scene.overlay.background)) {
          for (const key of Object.keys(scene.overlay.background)) {
            if (!OVERLAY_BACKGROUND_KEYS.has(key)) {
              add(issues, `${path}.overlay.background.${key}`, "is not an allowed overlay background property");
            }
          }
          if (scene.overlay.background.type !== "overviewTour") {
            add(issues, `${path}.overlay.background.type`, 'must equal "overviewTour"');
          }
          if (
            scene.overlay.background.dim != null
            && (!Number.isFinite(scene.overlay.background.dim)
              || scene.overlay.background.dim < 0
              || scene.overlay.background.dim > 0.8)
          ) {
            add(issues, `${path}.overlay.background.dim`, "must be between 0 and 0.8");
          }
          if (
            scene.overlay.background.interactive != null
            && typeof scene.overlay.background.interactive !== "boolean"
          ) {
            add(issues, `${path}.overlay.background.interactive`, "must be a boolean");
          }
        }
        if (scene.overlay.tour != null && !isObject(scene.overlay.tour)) {
          add(issues, `${path}.overlay.tour`, "must be an object");
        }
        if (isObject(scene.overlay.tour)) {
          for (const key of Object.keys(scene.overlay.tour)) {
            if (!OVERLAY_TOUR_KEYS.has(key)) {
              add(issues, `${path}.overlay.tour.${key}`, "is not an allowed overlay tour property");
            }
          }
          if (
            scene.overlay.tour.cycles != null
            && (!Number.isInteger(scene.overlay.tour.cycles)
              || scene.overlay.tour.cycles < 1
              || scene.overlay.tour.cycles > 5)
          ) {
            add(issues, `${path}.overlay.tour.cycles`, "must be an integer between 1 and 5");
          }
          for (const key of ["moveMs", "pauseMs"]) {
            if (
              scene.overlay.tour[key] != null
              && (!Number.isFinite(scene.overlay.tour[key])
                || scene.overlay.tour[key] < (key === "moveMs" ? 100 : 0)
                || scene.overlay.tour[key] > 10000)
            ) {
              add(
                issues,
                `${path}.overlay.tour.${key}`,
                `must be between ${key === "moveMs" ? 100 : 0} and 10000`,
              );
            }
          }
          if (
            scene.overlay.tour.endBehavior != null
            && !["hold", "loop"].includes(scene.overlay.tour.endBehavior)
          ) {
            add(issues, `${path}.overlay.tour.endBehavior`, 'must be "hold" or "loop"');
          }
        }
        if (scene.overlay.tour != null && scene.overlay.background?.type !== "overviewTour") {
          add(issues, `${path}.overlay.tour`, "requires background.type to equal \"overviewTour\"");
        }
      }

      if (scene.beats != null && !Array.isArray(scene.beats)) add(issues, `${path}.beats`, "must be an array");
      if (Array.isArray(scene.beats)) {
        const beatIds = new Set();
        scene.beats.forEach((beat, beatIndex) => {
          const beatPath = `${path}.beats[${beatIndex}]`;
          if (!isObject(beat)) {
            add(issues, beatPath, "must be an object");
            return;
          }
          for (const key of Object.keys(beat)) {
            if (!BEAT_KEYS.has(key)) add(issues, `${beatPath}.${key}`, "is not an allowed beat property");
          }
          if (checkId(issues, beat.id, `${beatPath}.id`)) {
            if (beatIds.has(beat.id)) add(issues, `${beatPath}.id`, `duplicates beat "${beat.id}"`);
            beatIds.add(beat.id);
          }
          for (const key of ["label", "caption"]) {
            if (beat[key] != null && typeof beat[key] !== "string") add(issues, `${beatPath}.${key}`, "must be a string");
          }
          checkIdList(issues, beat.show, `${beatPath}.show`, local);
          if (beat.focus != null) checkIdList(issues, beat.focus, `${beatPath}.focus`, local);
          if (beat.revealOrder != null) checkIdList(issues, beat.revealOrder, `${beatPath}.revealOrder`, local);
        });
      }
    });
  }

  const allEdges = [];
  if (Array.isArray(deck.scenes)) {
    deck.scenes.forEach((scene, sceneIndex) => {
      if (scene.edges != null && !Array.isArray(scene.edges)) add(issues, `scenes[${sceneIndex}].edges`, "must be an array");
      if (Array.isArray(scene.edges)) {
        scene.edges.forEach((edge, edgeIndex) => allEdges.push({ edge, path: `scenes[${sceneIndex}].edges[${edgeIndex}]` }));
      }
    });
  }
  if (deck.connections != null && !Array.isArray(deck.connections)) add(issues, "connections", "must be an array");
  if (Array.isArray(deck.connections)) {
    deck.connections.forEach((edge, edgeIndex) => allEdges.push({ edge, path: `connections[${edgeIndex}]` }));
  }
  const edgeIds = new Set();
  allEdges.forEach(({ edge, path }) => {
    if (!isObject(edge)) {
      add(issues, path, "must be an object");
      return;
    }
    for (const key of Object.keys(edge)) {
      if (!EDGE_KEYS.has(key)) add(issues, `${path}.${key}`, "is not an allowed edge property");
    }
    if (edge.id != null && checkId(issues, edge.id, `${path}.id`)) {
      if (edgeIds.has(edge.id)) add(issues, `${path}.id`, `duplicates edge "${edge.id}"`);
      edgeIds.add(edge.id);
    }
    if (!instanceIds.has(edge.from)) add(issues, `${path}.from`, `unknown instance "${edge.from}"`);
    if (!instanceIds.has(edge.to)) add(issues, `${path}.to`, `unknown instance "${edge.to}"`);
    if (edge.label != null && typeof edge.label !== "string") add(issues, `${path}.label`, "must be a string");
    if (edge.kind != null && (typeof edge.kind !== "string" || !KIND_RE.test(edge.kind))) add(issues, `${path}.kind`, "must be style tokens");
    if (edge.curve != null && !Number.isFinite(edge.curve)) add(issues, `${path}.curve`, "must be finite");
  });

  if (nodeCount > maxNodes) add(issues, "scenes", `contains ${nodeCount} instances; maximum is ${maxNodes}`);
  if (allEdges.length > maxEdges) add(issues, "connections", `deck contains ${allEdges.length} edges; maximum is ${maxEdges}`);

  if (deck.theme != null && !isObject(deck.theme)) add(issues, "theme", "must be an object");
  if (isObject(deck.theme?.colors)) {
    for (const [key, value] of Object.entries(deck.theme.colors)) {
      if (typeof value !== "string" || !HEX_COLOR_RE.test(value)) add(issues, `theme.colors.${key}`, "must be a six-digit hex color");
    }
  }

  return { valid: issues.length === 0, issues };
}

export function assertValidDeck(deck, options) {
  const result = validateDeck(deck, options);
  if (!result.valid) throw new DeckValidationError(result.issues);
  return deck;
}

export function formatIssues(issues) {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}
