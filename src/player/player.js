import { compileDeck } from "../core/compile.js";
import { borderPoint, boundsFor, fitBounds } from "../core/geometry.js";
import { createVisual } from "./visuals.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function element(name, className, text) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function svgElement(name, className) {
  const node = document.createElementNS(SVG_NS, name);
  if (className) node.setAttribute("class", className);
  return node;
}

function template() {
  const shell = element("div", "pz-shell");
  shell.innerHTML = `
    <div class="pz-viewport" aria-label="Graph presentation canvas">
      <div class="pz-world">
        <svg class="pz-edges" width="100" height="100" aria-hidden="true"></svg>
        <section class="pz-card" aria-hidden="true">
          <div class="pz-card-title"></div>
          <div class="pz-card-caption"></div>
        </section>
      </div>
    </div>
    <header class="pz-brand"></header>
    <div class="pz-legend" aria-hidden="true">
      <span style="--dot:var(--pz-indigo)">ideas</span>
      <span style="--dot:var(--pz-green)">new way</span>
      <span style="--dot:var(--pz-tan)">old way</span>
      <span style="--dot:var(--pz-light)">things</span>
    </div>
    <div class="pz-hint" aria-hidden="true">← → navigate · drag pan · scroll zoom<br>o overview · f fit · hover or focus for detail</div>
    <div class="pz-progress"></div>
    <div class="pz-dots" aria-label="Scenes"></div>
    <div class="pz-overflow">Readable scale preserved · drag to explore</div>
    <nav class="pz-nav" aria-label="Presentation controls">
      <button class="pz-control" data-action="decks" type="button">decks</button>
      <button class="pz-control" data-action="overview" type="button" aria-pressed="false">whole graph</button>
      <button class="pz-control optional" data-action="autoplay" type="button" aria-pressed="false">autoplay</button>
      <button class="pz-control is-icon" data-action="previous" type="button" aria-label="Previous beat">‹</button>
      <button class="pz-control is-icon" data-action="next" type="button" aria-label="Next beat">›</button>
    </nav>
    <section class="pz-deck-picker" role="dialog" aria-modal="true" aria-labelledby="pz-deck-picker-title" hidden>
      <div class="pz-deck-picker-box">
        <h2 id="pz-deck-picker-title">Select a deck</h2>
        <p>Choose a reviewed example or load a local, schema-valid JSON file. Deck content is treated as untrusted data.</p>
        <label>
          Built-in deck
          <select aria-label="Built-in deck"></select>
        </label>
        <div class="pz-deck-actions">
          <button type="button" data-deck-action="load">load selected</button>
          <button type="button" data-deck-action="file">choose local JSON</button>
          <button type="button" data-deck-action="close">cancel</button>
        </div>
        <pre class="pz-deck-error" aria-live="polite"></pre>
        <input type="file" accept=".json,application/json" hidden>
      </div>
    </section>
    <section class="pz-tip" role="dialog" aria-label="Node detail" hidden>
      <button class="pz-tip-close" type="button" aria-label="Close node detail">×</button>
      <div class="pz-tip-text"></div>
      <a class="pz-tip-source" target="_blank" rel="noopener noreferrer" hidden>source</a>
    </section>
    <div class="pz-toast" role="status" aria-live="polite"></div>
    <div class="pz-sr-only pz-live" aria-live="polite" aria-atomic="true"></div>
  `;
  return shell;
}

export class PrezographPlayer extends EventTarget {
  constructor(root, deck, options = {}) {
    super();
    this.root = root;
    this.options = options;
    this.reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.sceneIndex = 0;
    this.beatIndex = 0;
    this.overview = false;
    this.autoplayTimer = null;
    this.revealTimers = [];
    this.measurements = new Map();
    this.nodeViews = new Map();
    this.edgeViews = [];
    this.currentShow = new Set();
    this.currentFocus = new Set();
    this.camera = { x: 0, y: 0, scale: 1 };
    this.cameraTarget = { x: 0, y: 0, scale: 1 };
    this.pushContext = null;
    this.freeCamera = false;
    this.lastFrame = 0;
    this.pan = null;
    this.touches = new Map();
    this.pinch = null;
    this.toastTimer = null;
    this.shell = template();
    root.replaceChildren(this.shell);
    this.collectElements();
    this.bindControls();
    this.loadDeck(deck, { initial: true });
    this.frame = this.frame.bind(this);
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  collectElements() {
    const $ = (selector) => this.shell.querySelector(selector);
    this.viewport = $(".pz-viewport");
    this.world = $(".pz-world");
    this.svg = $(".pz-edges");
    this.card = $(".pz-card");
    this.brand = $(".pz-brand");
    this.progress = $(".pz-progress");
    this.dots = $(".pz-dots");
    this.overflowNotice = $(".pz-overflow");
    this.tip = $(".pz-tip");
    this.tipText = $(".pz-tip-text");
    this.tipSource = $(".pz-tip-source");
    this.toastElement = $(".pz-toast");
    this.live = $(".pz-live");
    this.controls = {
      decks: $('[data-action="decks"]'),
      overview: $('[data-action="overview"]'),
      autoplay: $('[data-action="autoplay"]'),
      previous: $('[data-action="previous"]'),
      next: $('[data-action="next"]')
    };
  }

  bindControls() {
    this.controls.previous.addEventListener("click", () => this.back());
    this.controls.next.addEventListener("click", () => this.advance());
    this.controls.overview.addEventListener("click", () => this.toggleOverview());
    this.controls.autoplay.addEventListener("click", () => this.toggleAutoplay());
    this.tip.querySelector(".pz-tip-close").addEventListener("click", () => this.hideTip());

    globalThis.addEventListener("keydown", (event) => {
      const tag = event.target?.tagName;
      if (["TEXTAREA", "INPUT", "SELECT"].includes(tag)) return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        this.advance();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.back();
      } else if (event.key.toLowerCase() === "o") {
        this.toggleOverview();
      } else if (event.key.toLowerCase() === "f") {
        this.fitCurrent({ snap: this.reducedMotion });
      } else if (event.key === "Escape") {
        this.hideTip();
      }
    });

    this.viewport.addEventListener("pointerdown", (event) => this.onViewportPointerDown(event));
    this.viewport.addEventListener("pointermove", (event) => this.onViewportPointerMove(event));
    this.viewport.addEventListener("pointerup", (event) => this.onViewportPointerEnd(event));
    this.viewport.addEventListener("pointercancel", (event) => this.onViewportPointerEnd(event));
    this.viewport.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
    globalThis.addEventListener("resize", () => {
      if (!this.freeCamera) this.fitCurrent({ snap: this.reducedMotion });
      this.positionTip();
    });
  }

  loadDeck(deck, options = {}) {
    const compiled = compileDeck(deck);
    const previousSceneId = !options.initial ? this.currentScene()?.id : null;
    this.stopAutoplay();
    this.hideTip();
    this.revealTimers.forEach(clearTimeout);
    this.revealTimers = [];
    this.compiled = compiled;
    this.applyTheme();
    this.buildGraph();
    this.buildSceneDots();
    const restored = previousSceneId
      ? this.compiled.scenes.findIndex((scene) => scene.id === previousSceneId)
      : 0;
    this.sceneIndex = restored >= 0 ? restored : 0;
    this.beatIndex = 0;
    this.overview = false;
    this.applyState({ snap: true, announce: !options.initial });
    this.shell.classList.add("is-ready");
    document.title = `${this.compiled.meta.title} · Prezograph`;
    this.dispatchEvent(new CustomEvent("deckchange", { detail: { deck: this.compiled.deck } }));
  }

  applyTheme() {
    const colorMap = {
      background: "--pz-bg",
      surface: "--pz-surface",
      ink: "--pz-ink",
      muted: "--pz-muted",
      light: "--pz-light",
      hair: "--pz-hair",
      indigo: "--pz-indigo",
      green: "--pz-green",
      tan: "--pz-tan"
    };
    for (const [key, variable] of Object.entries(colorMap)) {
      const value = this.compiled.theme.colors?.[key];
      if (value) this.shell.style.setProperty(variable, value);
    }
  }

  buildGraph() {
    this.nodeViews.clear();
    this.edgeViews = [];
    this.measurements.clear();
    this.world.querySelectorAll(".pz-node").forEach((node) => node.remove());
    this.svg.replaceChildren();

    for (const scene of this.compiled.scenes) {
      for (const instance of scene.instances) {
        instance.sceneAnchor = scene.anchor;
        const node = this.createNode(instance);
        this.world.appendChild(node);
        const view = {
          instance,
          scene,
          element: node,
          width: node.offsetWidth,
          height: node.offsetHeight,
          isRing: (instance.kind ?? "").split(" ").includes("ring"),
          radius: instance.r ?? 90,
          x: 0,
          y: 0,
          pushX: 0,
          pushY: 0,
          dragX: 0,
          dragY: 0,
          phase: ((instance.instanceIndex ?? 0) * 1.83) % (Math.PI * 2)
        };
        this.measurements.set(instance.id, { width: view.width, height: view.height });
        this.nodeViews.set(instance.id, view);
        this.bindNode(view);
      }
    }

    for (const edge of this.compiled.edges) this.createEdge(edge);
    this.sizeWorld();
  }

  createNode(instance) {
    const entity = instance.entityDef;
    const node = element("button", "pz-node");
    node.type = "button";
    node.dataset.instance = instance.id;
    node.dataset.entity = instance.entity;
    node.setAttribute("aria-label", [entity.title, entity.sub, entity.body].filter(Boolean).join(". "));
    node.tabIndex = -1;
    for (const token of (instance.kind ?? "ink").split(" ")) node.classList.add(`kind-${token}`);
    if (instance.w) node.style.width = `${instance.w}px`;
    if ((instance.kind ?? "").split(" ").includes("ring")) {
      const size = (instance.r ?? 90) * 2;
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
    }
    node.append(
      element("div", "pz-node-title", entity.title),
      ...(entity.sub ? [element("div", "pz-node-sub", entity.sub)] : []),
      ...(entity.body ? [element("div", "pz-node-body", entity.body)] : [])
    );
    const visual = instance.visual ? createVisual(instance.visual) : null;
    if (visual) node.appendChild(visual);
    return node;
  }

  bindNode(view) {
    const node = view.element;
    node.addEventListener("click", () => this.activateNode(view));
    node.addEventListener("focus", () => this.showTip(view, { persistent: false }));
    node.addEventListener("blur", (event) => {
      if (!this.tip.contains(event.relatedTarget)) this.hideTip();
    });
    node.addEventListener("pointerenter", () => this.showTip(view, { persistent: false }));
    node.addEventListener("pointerleave", () => {
      if (document.activeElement !== node && !this.tip.matches(":hover")) this.hideTip();
    });
  }

  activateNode(view) {
    if (this.currentFocus.has(view.instance.id)) {
      if (view.instance.entityDef.tip || view.instance.entityDef.source) this.showTip(view, { persistent: true });
      return;
    }
    const destinations = this.compiled.entityIndex.get(view.instance.entity) ?? [];
    const destination = destinations
      .map((id) => this.nodeViews.get(id))
      .find((candidate) => candidate.scene.id !== this.currentScene()?.id);
    if (destination) this.goScene(destination.scene.sceneIndex);
  }

  createEdge(edge) {
    const path = svgElement("path", "pz-edge");
    for (const token of (edge.kind ?? "").split(" ").filter(Boolean)) path.classList.add(`kind-${token}`);
    if (edge.kind?.includes("cross")) path.style.strokeDasharray = "7 6";
    this.svg.insertBefore(path, this.svg.firstChild);
    let label = null;
    if (edge.label) {
      label = svgElement("text", "pz-edge-label");
      label.textContent = edge.label;
      this.svg.appendChild(label);
    }
    this.edgeViews.push({ edge, path, label });
  }

  sizeWorld() {
    let maxX = 0;
    let maxY = 0;
    for (const view of this.nodeViews.values()) {
      maxX = Math.max(maxX, view.scene.anchor[0] + view.instance.pos[0] + view.width / 2);
      maxY = Math.max(maxY, view.scene.anchor[1] + view.instance.pos[1] + view.height / 2);
    }
    const width = Math.ceil(maxX + 500);
    const height = Math.ceil(maxY + 500);
    this.world.style.width = `${width}px`;
    this.world.style.height = `${height}px`;
    this.svg.setAttribute("width", width);
    this.svg.setAttribute("height", height);
  }

  buildSceneDots() {
    this.dots.replaceChildren();
    this.compiled.scenes.forEach((scene, index) => {
      const button = element("button", "pz-dot");
      button.type = "button";
      button.setAttribute("aria-label", `Go to scene ${index + 1}: ${scene.title}`);
      button.addEventListener("click", () => this.goScene(index));
      this.dots.appendChild(button);
    });
  }

  currentScene() {
    return this.compiled.scenes[this.sceneIndex];
  }

  currentBeat() {
    return this.currentScene()?.beats[this.beatIndex];
  }

  goScene(index, options = {}) {
    const count = this.compiled.scenes.length;
    this.sceneIndex = (index + count) % count;
    this.beatIndex = options.beat ?? 0;
    this.overview = false;
    this.freeCamera = false;
    this.applyState({ snap: options.snap ?? false, announce: true });
  }

  advance() {
    if (this.overview) return this.goScene(0);
    const scene = this.currentScene();
    if (this.beatIndex < scene.beats.length - 1) {
      this.beatIndex += 1;
      this.applyState({ announce: true });
    } else {
      this.goScene(this.sceneIndex + 1);
    }
  }

  back() {
    if (this.overview) return this.goScene(this.compiled.scenes.length - 1);
    if (this.beatIndex > 0) {
      this.beatIndex -= 1;
      this.applyState({ announce: true });
    } else {
      const previous = (this.sceneIndex - 1 + this.compiled.scenes.length) % this.compiled.scenes.length;
      this.sceneIndex = previous;
      this.beatIndex = this.currentScene().beats.length - 1;
      this.applyState({ announce: true });
    }
  }

  toggleOverview() {
    this.overview = !this.overview;
    this.freeCamera = false;
    this.applyState({ snap: this.reducedMotion, announce: true });
  }

  applyState(options = {}) {
    this.hideTip();
    this.revealTimers.forEach(clearTimeout);
    this.revealTimers = [];
    const previousShow = this.currentShow;
    const scene = this.currentScene();
    const beat = this.currentBeat();
    this.currentShow = this.overview
      ? new Set(this.compiled.instanceMap.keys())
      : new Set(beat.show);
    this.currentFocus = this.overview
      ? new Set(this.compiled.instanceMap.keys())
      : new Set(beat.focus);

    for (const [id, view] of this.nodeViews) {
      const inScene = view.scene.id === scene.id;
      const shown = this.currentShow.has(id);
      const active = this.currentFocus.has(id);
      view.element.classList.toggle("is-active", active);
      view.element.classList.toggle("is-shown", shown && !active);
      view.element.classList.toggle("is-context", !shown);
      view.element.classList.toggle("is-beat-hidden", inScene && !shown && !this.overview);
      view.element.setAttribute("aria-hidden", active ? "false" : "true");
      view.element.tabIndex = active ? 0 : -1;
      if ("inert" in view.element) view.element.inert = !active;
    }

    if (!this.overview && !this.reducedMotion) {
      const fresh = beat.revealOrder.filter((id) => this.currentShow.has(id) && !previousShow.has(id));
      fresh.forEach((id) => this.nodeViews.get(id)?.element.classList.add("is-revealing"));
      fresh.forEach((id, index) => {
        this.revealTimers.push(setTimeout(() => {
          this.nodeViews.get(id)?.element.classList.remove("is-revealing");
        }, 80 + index * 115));
      });
    }

    this.updateEdges();
    this.updateChrome();
    this.fitCurrent({ snap: options.snap });
    if (options.announce) this.announce();
    this.dispatchEvent(new CustomEvent("scenechange", {
      detail: { sceneIndex: this.sceneIndex, beatIndex: this.beatIndex, overview: this.overview }
    }));
  }

  updateEdges() {
    for (const view of this.edgeViews) {
      const fromShown = this.currentShow.has(view.edge.from);
      const toShown = this.currentShow.has(view.edge.to);
      const fromFocus = this.currentFocus.has(view.edge.from);
      const toFocus = this.currentFocus.has(view.edge.to);
      const hidden = !this.overview && (
        (this.nodeViews.get(view.edge.from)?.scene.id === this.currentScene().id && !fromShown) ||
        (this.nodeViews.get(view.edge.to)?.scene.id === this.currentScene().id && !toShown)
      );
      const on = this.overview || (fromFocus && toFocus);
      const half = !on && view.edge.kind?.includes("cross") && (fromFocus || toFocus);
      view.path.classList.toggle("is-hidden", hidden);
      view.path.classList.toggle("is-on", on);
      view.path.classList.toggle("is-half", half);
      if (view.label) {
        view.label.classList.toggle("is-on", on);
        view.label.classList.toggle("is-hidden", hidden);
      }
    }
  }

  updateChrome() {
    const scene = this.currentScene();
    const beat = this.currentBeat();
    this.brand.replaceChildren();
    const strong = element("strong", null, this.compiled.meta.title);
    this.brand.append(strong);
    const meta = [this.compiled.meta.event, this.compiled.meta.date].filter(Boolean).join(" · ");
    if (meta) this.brand.append(document.createTextNode(` · ${meta}`));

    if (this.overview) {
      this.progress.textContent = `overview · ${this.compiled.scenes.length} scenes`;
      this.card.querySelector(".pz-card-title").textContent = "One graph";
      this.card.querySelector(".pz-card-caption").textContent = "Explore the complete presentation graph; choose a scene dot or node to return.";
    } else {
      const beatSuffix = scene.beats.length > 1 ? ` · ${this.beatIndex + 1}/${scene.beats.length}` : "";
      this.progress.textContent = `${String(this.sceneIndex + 1).padStart(2, "0")} / ${String(this.compiled.scenes.length).padStart(2, "0")}${beatSuffix}`;
      this.card.querySelector(".pz-card-title").textContent = scene.title;
      this.card.querySelector(".pz-card-caption").textContent = beat.caption ?? scene.caption ?? "";
    }

    this.card.hidden = !this.overview && scene.layout.noCard === true;
    this.controls.overview.setAttribute("aria-pressed", String(this.overview));
    [...this.dots.children].forEach((dot, index) => {
      if (!this.overview && index === this.sceneIndex) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });
  }

  fitCurrent(options = {}) {
    const scene = this.currentScene();
    const ids = this.overview ? [...this.compiled.instanceMap.keys()] : [...this.currentFocus];
    const bounds = boundsFor(ids, this.compiled.instanceMap, this.measurements);
    const cardSpace = this.card.hidden ? 0 : Math.min(130, this.card.offsetHeight + 44);
    const layout = this.overview
      ? { ...scene.layout, minReadableScale: 0.08, zoomMax: 0.32, fitMargin: 80 }
      : scene.layout;
    const fit = fitBounds(bounds, {
      width: innerWidth,
      height: innerHeight
    }, layout, {
      cardSpace,
      safeArea: innerWidth < 700
        ? { top: 84, right: 14, bottom: 112, left: 14 }
        : { top: 24, right: 24, bottom: 82, left: 24 },
    });
    this.cameraTarget = { x: fit.x, y: fit.y, scale: fit.scale };
    this.overflowNotice.classList.toggle("is-visible", !this.overview && fit.overflow);
    this.positionCard(bounds);
    this.pushContext = this.overview ? null : {
      x: fit.x,
      y: fit.y,
      halfWidth: fit.availableWidth / 2 / fit.scale,
      halfHeight: fit.availableHeight / 2 / fit.scale,
      margin: layout.pushMargin
    };
    if (options.snap || this.reducedMotion || !this.shell.classList.contains("is-ready")) {
      this.camera = { ...this.cameraTarget };
      this.renderWorldTransform();
    }
  }

  positionCard(bounds) {
    if (this.card.hidden) return;
    this.card.style.left = `${(bounds.x0 + bounds.x1 - this.card.offsetWidth) / 2}px`;
    this.card.style.top = `${bounds.y0 - this.card.offsetHeight - 66}px`;
  }

  announce() {
    const scene = this.currentScene();
    const beat = this.currentBeat();
    this.live.textContent = this.overview
      ? `Whole graph overview. ${this.compiled.scenes.length} scenes.`
      : `Scene ${this.sceneIndex + 1} of ${this.compiled.scenes.length}: ${scene.title}. ${beat.label ?? beat.caption ?? scene.caption ?? ""}`;
  }

  showTip(view, options = {}) {
    const entity = view.instance.entityDef;
    if (!entity.tip && !entity.source) return;
    this.tipView = view;
    this.tip.dataset.persistent = String(options.persistent ?? false);
    this.tipText.textContent = entity.tip ?? [entity.title, entity.sub, entity.body].filter(Boolean).join(". ");
    if (entity.source) {
      this.tipSource.hidden = false;
      this.tipSource.href = entity.source;
      this.tipSource.textContent = entity.sourceDate ? `source · ${entity.sourceDate}` : "source";
    } else {
      this.tipSource.hidden = true;
      this.tipSource.removeAttribute("href");
    }
    this.tip.hidden = false;
    this.positionTip();
  }

  positionTip() {
    if (!this.tipView || this.tip.hidden) return;
    const rect = this.tipView.element.getBoundingClientRect();
    this.tip.style.left = "0px";
    this.tip.style.top = "0px";
    const tipRect = this.tip.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - tipRect.width / 2;
    let y = rect.top - tipRect.height - 10;
    x = Math.max(10, Math.min(innerWidth - tipRect.width - 10, x));
    if (y < 10) y = rect.bottom + 10;
    this.tip.style.left = `${x}px`;
    this.tip.style.top = `${Math.min(innerHeight - tipRect.height - 10, y)}px`;
  }

  hideTip() {
    this.tip.hidden = true;
    this.tipView = null;
  }

  toggleAutoplay() {
    if (this.autoplayTimer) this.stopAutoplay();
    else {
      this.controls.autoplay.setAttribute("aria-pressed", "true");
      this.controls.autoplay.textContent = "pause";
      this.autoplayTimer = setInterval(() => this.advance(), 4200);
      this.toast("Autoplay started");
    }
  }

  stopAutoplay() {
    if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    this.autoplayTimer = null;
    if (this.controls) {
      this.controls.autoplay.setAttribute("aria-pressed", "false");
      this.controls.autoplay.textContent = "autoplay";
    }
  }

  onViewportPointerDown(event) {
    if (event.target.closest?.(".pz-node, .pz-nav, .pz-deck-picker, .pz-tip")) return;
    this.hideTip();
    this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.touches.size === 1) {
      this.pan = { x: event.clientX, y: event.clientY, cameraX: this.camera.x, cameraY: this.camera.y };
    } else if (this.touches.size === 2) {
      const [a, b] = [...this.touches.values()];
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: this.camera.scale,
        worldX: this.camera.x + (midpoint.x - innerWidth / 2) / this.camera.scale,
        worldY: this.camera.y + (midpoint.y - innerHeight / 2) / this.camera.scale
      };
      this.pan = null;
    }
    this.viewport.classList.add("is-dragging");
    this.viewport.setPointerCapture?.(event.pointerId);
  }

  onViewportPointerMove(event) {
    if (!this.touches.has(event.pointerId)) return;
    this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pinch && this.touches.size >= 2) {
      this.freeCamera = true;
      const [a, b] = [...this.touches.values()];
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      this.camera.scale = Math.min(2.5, Math.max(0.08, this.pinch.scale * distance / this.pinch.distance));
      this.camera.x = this.pinch.worldX - (midpoint.x - innerWidth / 2) / this.camera.scale;
      this.camera.y = this.pinch.worldY - (midpoint.y - innerHeight / 2) / this.camera.scale;
      return;
    }
    if (!this.pan) return;
    const dx = event.clientX - this.pan.x;
    const dy = event.clientY - this.pan.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) this.freeCamera = true;
    if (this.freeCamera) {
      this.camera.x = this.pan.cameraX - dx / this.camera.scale;
      this.camera.y = this.pan.cameraY - dy / this.camera.scale;
    }
  }

  onViewportPointerEnd(event) {
    this.touches.delete(event.pointerId);
    if (this.touches.size < 2) this.pinch = null;
    if (this.touches.size === 1) {
      const [remaining] = [...this.touches.values()];
      this.pan = { x: remaining.x, y: remaining.y, cameraX: this.camera.x, cameraY: this.camera.y };
    } else {
      this.pan = null;
      this.viewport.classList.remove("is-dragging");
    }
  }

  onWheel(event) {
    event.preventDefault();
    this.freeCamera = true;
    const factor = Math.exp(-event.deltaY * 0.0012);
    const worldX = this.camera.x + (event.clientX - innerWidth / 2) / this.camera.scale;
    const worldY = this.camera.y + (event.clientY - innerHeight / 2) / this.camera.scale;
    this.camera.scale = Math.min(2.5, Math.max(0.08, this.camera.scale * factor));
    this.camera.x = worldX - (event.clientX - innerWidth / 2) / this.camera.scale;
    this.camera.y = worldY - (event.clientY - innerHeight / 2) / this.camera.scale;
  }

  pushTarget(view) {
    if (!this.pushContext || this.currentFocus.has(view.instance.id)) return [0, 0];
    const homeX = view.scene.anchor[0] + view.instance.pos[0];
    const homeY = view.scene.anchor[1] + view.instance.pos[1];
    let dx = homeX - this.pushContext.x;
    let dy = homeY - this.pushContext.y;
    if (!dx && !dy) dy = 1;
    const halfWidth = (view.isRing ? view.radius : view.width / 2) + this.pushContext.halfWidth + this.pushContext.margin;
    const halfHeight = (view.isRing ? view.radius : view.height / 2) + this.pushContext.halfHeight + this.pushContext.margin;
    const ratio = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
    if (ratio >= 1) return [0, 0];
    const factor = 1 / Math.max(0.0001, ratio);
    return [dx * (factor - 1), dy * (factor - 1)];
  }

  frame(timestamp) {
    const dt = this.lastFrame ? Math.min(0.05, (timestamp - this.lastFrame) / 1000) : 1 / 60;
    this.lastFrame = timestamp;
    const cameraEase = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 8);
    if (!this.freeCamera) {
      this.camera.x += (this.cameraTarget.x - this.camera.x) * cameraEase;
      this.camera.y += (this.cameraTarget.y - this.camera.y) * cameraEase;
      this.camera.scale += (this.cameraTarget.scale - this.camera.scale) * cameraEase;
    }
    this.renderWorldTransform();

    const pushEase = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
    for (const view of this.nodeViews.values()) {
      const active = this.currentFocus.has(view.instance.id);
      const floatAmount = this.reducedMotion || !active ? 0 : view.scene.layout.floatAmp;
      const floatX = Math.sin(timestamp * 0.00055 + view.phase) * floatAmount;
      const floatY = Math.cos(timestamp * 0.00045 + view.phase * 1.4) * floatAmount;
      const [targetPushX, targetPushY] = this.pushTarget(view);
      view.pushX += (targetPushX - view.pushX) * pushEase;
      view.pushY += (targetPushY - view.pushY) * pushEase;
      view.x = view.scene.anchor[0] + view.instance.pos[0] + floatX + view.pushX;
      view.y = view.scene.anchor[1] + view.instance.pos[1] + floatY + view.pushY;
      view.element.style.transform = `translate(${view.x - view.width / 2}px, ${view.y - view.height / 2}px)`;
    }
    this.renderEdges();
    if (this.tipView) this.positionTip();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  renderWorldTransform() {
    this.world.style.transform = `translate(${innerWidth / 2 - this.camera.x * this.camera.scale}px, ${innerHeight / 2 - this.camera.y * this.camera.scale}px) scale(${this.camera.scale})`;
  }

  renderEdges() {
    for (const view of this.edgeViews) {
      const from = this.nodeViews.get(view.edge.from);
      const to = this.nodeViews.get(view.edge.to);
      if (!from || !to) continue;
      const [fromX, fromY] = borderPoint(from, to.x, to.y);
      const [toX, toY] = borderPoint(to, from.x, from.y);
      if (view.edge.curve) {
        const midpointX = (fromX + toX) / 2;
        const midpointY = (fromY + toY) / 2;
        let perpendicularX = -(toY - fromY);
        let perpendicularY = toX - fromX;
        const length = Math.hypot(perpendicularX, perpendicularY) || 1;
        perpendicularX = perpendicularX / length * view.edge.curve;
        perpendicularY = perpendicularY / length * view.edge.curve;
        view.path.setAttribute("d", `M ${fromX} ${fromY} Q ${midpointX + perpendicularX} ${midpointY + perpendicularY} ${toX} ${toY}`);
      } else {
        view.path.setAttribute("d", `M ${fromX} ${fromY} L ${toX} ${toY}`);
      }
      if (view.label) {
        view.label.setAttribute("x", (fromX + toX) / 2);
        view.label.setAttribute("y", (fromY + toY) / 2 - 8);
      }
    }
  }

  toast(message) {
    this.toastElement.textContent = message;
    this.toastElement.classList.add("is-visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastElement.classList.remove("is-visible"), 2200);
  }

  destroy() {
    this.stopAutoplay();
    cancelAnimationFrame(this.animationFrame);
    this.root.replaceChildren();
  }
}
