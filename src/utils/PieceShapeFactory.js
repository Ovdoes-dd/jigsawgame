export function generatePieces({
  scene,
  imageKey,
  rows,
  cols,
  puzzleW,
  puzzleH,
  mode = 'RECT',
  quadJitterRatio = 0.28,
  minCellPortion = 0.15
}) {
  const cellW = puzzleW / cols;
  const cellH = puzzleH / rows;

  const srcImg = scene.textures.get(imageKey).getSourceImage();
  const baseScale = Math.min(puzzleW / srcImg.width, puzzleH / srcImg.height);

  if (mode === 'QUAD') {
    return generateQuadPieces({
      scene, srcImg, baseScale,
      rows, cols,
      puzzleW, puzzleH,
      cellW, cellH,
      quadJitterRatio, minCellPortion
    });
  } else {
    return generateRectPieces({
      scene, srcImg, baseScale,
      rows, cols,
      puzzleW, puzzleH,
      cellW, cellH
    });
  }
}

function generateRectPieces({
  scene, srcImg, baseScale,
  rows, cols, puzzleW, puzzleH, cellW, cellH
}) {
  const toIntWidths = (total, parts) => {
    total = Math.round(total);
    const base = Math.floor(total / parts);
    const arr = Array(parts).fill(base);
    let rem = total - base * parts;
    for (let i = 0; i < parts && rem > 0; i++) { arr[i]++; rem--; }
    return arr;
  };
  const colW = toIntWidths(puzzleW, cols);
  const rowH = toIntWidths(puzzleH, rows);

  const xCuts = [0]; for (let i = 0; i < colW.length; i++) xCuts.push(xCuts[i] + colW[i]);
  const yCuts = [0]; for (let j = 0; j < rowH.length; j++) yCuts.push(yCuts[j] + rowH[j]);

  const piecesMeta = [];

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const minX = xCuts[gx];
      const minY = yCuts[gy];
      const w = colW[gx];
      const h = rowH[gy];

      const key = `rect-${gx}-${gy}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);

      const canvasTex = scene.textures.createCanvas(key, w, h);
      const ctx = canvasTex.getContext();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      ctx.scale(baseScale, baseScale);
      ctx.drawImage(srcImg, -minX / baseScale, -minY / baseScale);
      ctx.restore();
      canvasTex.refresh();

      piecesMeta.push({
        key, w, h,
        gx, gy,
        idx: gy * cols + gx,
        minX, minY,
        anchorX: minX,
        anchorY: minY,
        polyPoints: [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h },
            { x: 0, y: h }
        ]
      });
    }
  }

  return { piecesMeta, cellW, cellH };
}

function generateQuadPieces({
  scene, srcImg, baseScale,
  rows, cols, puzzleW, puzzleH, cellW, cellH,
  quadJitterRatio, minCellPortion
}) {
  const jitterX = cellW * quadJitterRatio;
  const jitterY = cellH * quadJitterRatio;
  const minGapX = cellW * minCellPortion;
  const minGapY = cellH * minCellPortion;

  const points = [];
  for (let r = 0; r <= rows; r++) {
    const rowArr = [];
    for (let c = 0; c <= cols; c++) {
      let x = c * cellW;
      let y = r * cellH;
      if (!(r === 0 || r === rows || c === 0 || c === cols)) {
        x += randRange(-jitterX, jitterX);
        y += randRange(-jitterY, jitterY);
      }
      rowArr.push({ x, y });
    }
    points.push(rowArr);
  }

  for (let r = 0; r <= rows; r++) {
    for (let c = 1; c < cols; c++) {
      const prev = points[r][c - 1];
      const cur = points[r][c];
      if (cur.x - prev.x < minGapX) cur.x = prev.x + minGapX;
    }
  }
  for (let c = 0; c <= cols; c++) {
    for (let r = 1; r < rows; r++) {
      const prev = points[r - 1][c];
      const cur = points[r][c];
      if (cur.y - prev.y < minGapY) cur.y = prev.y + minGapY;
    }
  }

  const piecesMeta = [];

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const p00 = points[gy][gx];
      const p10 = points[gy][gx + 1];
      const p11 = points[gy + 1][gx + 1];
      const p01 = points[gy + 1][gx];

      const verts = [p00, p10, p11, p01];

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const v of verts) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
      minX = Math.floor(minX);
      minY = Math.floor(minY);
      maxX = Math.ceil(maxX);
      maxY = Math.ceil(maxY);
      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);

      const polyPoints = verts.map(v => ({ x: v.x - minX, y: v.y - minY }));

      const key = `quad-${gx}-${gy}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);

      const canvasTex = scene.textures.createCanvas(key, w, h);
      const ctx = canvasTex.getContext();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
      for (let i = 1; i < polyPoints.length; i++) ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
      ctx.closePath();
      ctx.clip();
      ctx.scale(baseScale, baseScale);
      ctx.drawImage(srcImg, -minX / baseScale, -minY / baseScale);
      ctx.restore();
      canvasTex.refresh();

      piecesMeta.push({
        key, w, h,
        gx, gy,
        idx: gy * cols + gx,
        minX, minY,
        anchorX: minX,
        anchorY: minY,
        polyPoints
      });
    }
  }

  return { piecesMeta, cellW, cellH };
}

function randRange(a, b) { return a + Math.random() * (b - a); }