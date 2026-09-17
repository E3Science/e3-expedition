/**
 * Mirrors the Phaser overhead tile layer above the transparent Three.js world
 * canvas. This keeps 3D players and mobs as 3D models while allowing tree
 * canopies, roof fronts, and other layer-3 art to cover them.
 */
export function createWorldOverheadLayer({
  container,
  phaserCanvas,
  getCamera,
  getTiles,
  getDisplayFrame,
  getTilePosition,
  isEnabled,
  imageUrl,
  frameWidth = 64,
  frameHeight = 64,
  sheetColumns = 10
}) {
  if (!container || !phaserCanvas || !imageUrl) return null;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;

  canvas.id = "world-overhead-layer";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    pointerEvents: "none",
    zIndex: "3",
    imageRendering: "pixelated"
  });
  container.appendChild(canvas);

  const image = new Image();
  image.decoding = "async";
  image.src = imageUrl;

  let disposed = false;
  let lastBoundsKey = "";

  function syncCanvasBounds() {
    const canvasRect = phaserCanvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const left = canvasRect.left - containerRect.left;
    const top = canvasRect.top - containerRect.top;
    const width = Math.max(1, canvasRect.width);
    const height = Math.max(1, canvasRect.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const boundsKey = `${left}:${top}:${width}:${height}:${pixelRatio}`;

    if (boundsKey === lastBoundsKey) return;
    lastBoundsKey = boundsKey;

    Object.assign(canvas.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    });
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
  }

  function clear() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function update() {
    if (disposed) return;
    syncCanvasBounds();
    clear();

    if (!isEnabled?.() || !image.complete || image.naturalWidth <= 0) return;

    const camera = getCamera?.();
    const tiles = getTiles?.();
    if (!camera || !Array.isArray(tiles) || tiles.length === 0) return;

    const view = camera.worldView;
    const cssWidth = Math.max(1, canvas.getBoundingClientRect().width);
    const cssHeight = Math.max(1, canvas.getBoundingClientRect().height);
    const scaleX = cssWidth / Math.max(1, view.width);
    const scaleY = cssHeight / Math.max(1, view.height);
    const pixelRatioX = canvas.width / cssWidth;
    const pixelRatioY = canvas.height / cssHeight;
    const drawScaleX = scaleX * pixelRatioX;
    const drawScaleY = scaleY * pixelRatioY;
    const drawEntries = [];

    for (let row = 0; row < tiles.length; row += 1) {
      const tileRow = tiles[row];
      if (!Array.isArray(tileRow)) continue;

      for (let column = 0; column < tileRow.length; column += 1) {
        const storedFrame = tileRow[column];
        if (!Number.isInteger(storedFrame) || storedFrame < 0) continue;

        const frame = getDisplayFrame?.(storedFrame);
        if (!Number.isInteger(frame) || frame < 0) continue;

        const position = getTilePosition?.(column, row);
        if (!position) continue;

        const left = position.x - frameWidth / 2;
        const top = position.y - frameHeight;
        if (
          left > view.right ||
          left + frameWidth < view.left ||
          top > view.bottom ||
          top + frameHeight < view.top
        ) {
          continue;
        }

        drawEntries.push({
          frame,
          row,
          column,
          depth: row + column,
          x: (left - view.left) * drawScaleX,
          y: (top - view.top) * drawScaleY
        });
      }
    }

    drawEntries.sort(
      (left, right) =>
        left.depth - right.depth ||
        left.row - right.row ||
        left.column - right.column
    );

    drawEntries.forEach((entry) => {
      const sourceX = (entry.frame % sheetColumns) * frameWidth;
      const sourceY = Math.floor(entry.frame / sheetColumns) * frameHeight;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        entry.x,
        entry.y,
        frameWidth * drawScaleX,
        frameHeight * drawScaleY
      );
    });
  }

  return {
    update,
    dispose() {
      disposed = true;
      canvas.remove();
    }
  };
}
