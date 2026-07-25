import { assertValidDeck } from "./schema.js";

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function compileDeck(input, options) {
  assertValidDeck(input, options);
  const deck = clone(input);
  const entityMap = new Map(Object.entries(deck.entities));
  const instanceMap = new Map();
  const entityIndex = new Map();

  const scenes = deck.scenes.map((scene, sceneIndex) => {
    const instanceIds = new Set(scene.instances.map((instance) => instance.id));
    const instances = scene.instances.map((instance, instanceIndex) => {
      const compiled = {
        ...instance,
        sceneId: scene.id,
        sceneIndex,
        instanceIndex,
        entityDef: entityMap.get(instance.entity)
      };
      instanceMap.set(compiled.id, compiled);
      const locations = entityIndex.get(compiled.entity) ?? [];
      locations.push(compiled.id);
      entityIndex.set(compiled.entity, locations);
      return compiled;
    });

    const allIds = instances.map((instance) => instance.id);
    const beats = scene.beats?.length
      ? scene.beats.map((beat) => {
          const show = [...beat.show];
          const focus = beat.focus?.length ? [...beat.focus] : [...show];
          return {
            ...beat,
            show,
            focus,
            revealOrder: beat.revealOrder?.length ? [...beat.revealOrder] : [...show]
          };
        })
      : [{ id: "all", show: allIds, focus: allIds, revealOrder: allIds }];

    return {
      ...scene,
      instances,
      instanceIds,
      beats,
      overlay: scene.overlay
        ? {
            position: "center",
            shape: "slide",
            aspectRatio: "16:9",
            title: scene.title,
            caption: scene.caption ?? "",
            ...scene.overlay,
            background: scene.overlay.background
              ? {
                  dim: 0.22,
                  interactive: false,
                  ...scene.overlay.background,
                }
              : null,
            tour: scene.overlay.background?.type === "overviewTour"
              ? {
                  cycles: 1,
                  moveMs: 850,
                  pauseMs: 650,
                  endBehavior: "hold",
                  ...(scene.overlay.tour ?? {}),
                }
              : null,
          }
        : null,
      layout: {
        fitMargin: 150,
        pushMargin: 160,
        zoomMax: 1.15,
        floatAmp: 3.5,
        minReadableScale: 0.58,
        ...(deck.layoutDefaults ?? {}),
        ...(scene.layout ?? {})
      }
    };
  });

  const edges = [
    ...scenes.flatMap((scene) => (scene.edges ?? []).map((edge) => ({ ...edge, sceneId: scene.id }))),
    ...(deck.connections ?? []).map((edge) => ({ ...edge, sceneId: null }))
  ];

  return {
    deck,
    meta: deck.meta,
    theme: deck.theme ?? {},
    entities: entityMap,
    scenes,
    instanceMap,
    entityIndex,
    edges
  };
}

export function serializeDeck(compiledOrDeck) {
  const deck = compiledOrDeck.deck ?? compiledOrDeck;
  return `${JSON.stringify(deck, null, 2)}\n`;
}
