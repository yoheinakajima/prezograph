export function nodeHalfSize(instance, measured) {
  if ((instance.kind ?? "").split(" ").includes("ring")) {
    const radius = instance.r ?? 90;
    return { x: radius, y: radius };
  }
  return {
    x: (measured?.width ?? instance.w ?? 180) / 2,
    y: (measured?.height ?? 80) / 2
  };
}

export function boundsFor(instanceIds, instanceMap, measurements = new Map()) {
  if (!instanceIds.length) return { x0: 0, y0: 0, x1: 1, y1: 1, width: 1, height: 1 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const id of instanceIds) {
    const instance = instanceMap.get(id);
    if (!instance) continue;
    const half = nodeHalfSize(instance, measurements.get(id));
    const x = instance.sceneAnchor[0] + instance.pos[0];
    const y = instance.sceneAnchor[1] + instance.pos[1];
    x0 = Math.min(x0, x - half.x);
    y0 = Math.min(y0, y - half.y);
    x1 = Math.max(x1, x + half.x);
    y1 = Math.max(y1, y + half.y);
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 1, y1: 1, width: 1, height: 1 };
  return { x0, y0, x1, y1, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
}

export function fitBounds(bounds, viewport, layout, options = {}) {
  const mobile = viewport.width < 700;
  const pad = mobile ? Math.min(layout.fitMargin, 54) : layout.fitMargin;
  const cardSpace = options.cardSpace ?? 0;
  const safe = {
    top: options.safeArea?.top ?? 0,
    right: options.safeArea?.right ?? 0,
    bottom: options.safeArea?.bottom ?? 0,
    left: options.safeArea?.left ?? 0,
  };
  const availableWidth = Math.max(1, viewport.width - safe.left - safe.right);
  const availableHeight = Math.max(1, viewport.height - safe.top - safe.bottom);
  const ideal = Math.min(
    availableWidth / (bounds.width + pad * 2),
    availableHeight / (bounds.height + pad * 2 + cardSpace),
    layout.zoomMax
  );
  const floor = mobile
    ? Math.min(layout.minReadableScale, options.mobileEmergencyFloor ?? 0.18)
    : layout.minReadableScale;
  const scale = Math.max(floor, ideal);
  const safeCenterX = safe.left + availableWidth / 2;
  const safeCenterY = safe.top + availableHeight / 2;
  return {
    x: (bounds.x0 + bounds.x1) / 2 - (safeCenterX - viewport.width / 2) / scale,
    y: (bounds.y0 + bounds.y1) / 2
      - (safeCenterY - viewport.height / 2) / scale
      - (cardSpace ? cardSpace / (2 * scale) : 0),
    scale,
    idealScale: ideal,
    overflow: ideal < floor,
    availableWidth,
    availableHeight,
    pad
  };
}

export function fitWindow(bounds, viewport, layout, options = {}) {
  const fit = fitBounds(bounds, viewport, layout, options);
  if (options.aspectRatio) {
    let halfWidth = (bounds.width + fit.pad * 2) / 2;
    let halfHeight = (bounds.height + fit.pad * 2 + (options.cardSpace ?? 0)) / 2;
    if (halfWidth / halfHeight < options.aspectRatio) {
      halfWidth = halfHeight * options.aspectRatio;
    } else {
      halfHeight = halfWidth / options.aspectRatio;
    }
    return {
      x: fit.x,
      y: fit.y,
      halfWidth,
      halfHeight,
      margin: layout.pushMargin,
      scale: fit.scale,
    };
  }
  return {
    x: fit.x,
    y: fit.y,
    halfWidth: fit.availableWidth / (2 * fit.scale),
    halfHeight: fit.availableHeight / (2 * fit.scale),
    margin: layout.pushMargin,
    scale: fit.scale,
  };
}

export function interpolateWindow(from, to, amount) {
  const t = Math.max(0, Math.min(1, amount));
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    halfWidth: from.halfWidth + (to.halfWidth - from.halfWidth) * t,
    halfHeight: from.halfHeight + (to.halfHeight - from.halfHeight) * t,
    margin: to.margin,
    scale: from.scale + (to.scale - from.scale) * t,
  };
}

export function borderPoint(node, targetX, targetY) {
  const dx = targetX - node.x;
  const dy = targetY - node.y;
  if (!dx && !dy) return [node.x, node.y];
  if (node.isRing) {
    const distance = Math.hypot(dx, dy) || 1;
    return [node.x + (dx / distance) * node.radius, node.y + (dy / distance) * node.radius];
  }
  const halfWidth = node.width / 2 + 6;
  const halfHeight = node.height / 2 + 6;
  const scale = Math.min(dx ? halfWidth / Math.abs(dx) : Infinity, dy ? halfHeight / Math.abs(dy) : Infinity, 1);
  return [node.x + dx * scale, node.y + dy * scale];
}
