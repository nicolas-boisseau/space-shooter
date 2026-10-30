export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 7680;
export const BACKGROUND_VEIL_ALPHA = 0.42;
export const CLOUD_ALPHA = 0.5;
const TILE_HEIGHT = 960;
const WORLD_SCALE = 0.5;
const SCROLL_SPEED = 32;

export const LANDMARKS = [
  { name: "Pont d'Aquitaine", y: 860, type: 'suspension' },
  { name: 'Cité du Vin', y: 2060, type: 'wine' },
  { name: 'Pont Chaban-Delmas', y: 2340, type: 'lift' },
  { name: 'Place des Quinconces', y: 3460, type: 'square' },
  { name: 'Grand Théâtre', y: 3760, type: 'theatre' },
  { name: 'Place de la Bourse', y: 4050, type: 'bourse' },
  { name: 'Cathédrale Saint-André', y: 4340, type: 'cathedral' },
  { name: 'Pont de Pierre', y: 4590, type: 'stone' },
  { name: 'Basilique Saint-Michel', y: 4970, type: 'basilica' },
  { name: 'Pont Saint-Jean', y: 5530, type: 'road' },
  { name: 'Pont Simone-Veil', y: 6520, type: 'wide' },
  { name: 'Arkéa Arena', y: 6720, type: 'arena' }
];

const RIVER_POINTS = [
  [0, 600, 94], [500, 640, 98], [1100, 710, 102],
  [2050, 730, 104], [2650, 726, 98], [3400, 649, 91],
  [4050, 573, 88], [4700, 528, 86], [5400, 557, 90],
  [6520, 645, 100], [7100, 620, 96], [MAP_HEIGHT, 600, 94]
];

function riverAt(y) {
  const wrapped = ((y % MAP_HEIGHT) + MAP_HEIGHT) % MAP_HEIGHT;
  const index = RIVER_POINTS.findIndex(point => point[0] > wrapped);
  const [y0, x0, w0] = RIVER_POINTS[index - 1];
  const [y1, x1, w1] = RIVER_POINTS[index];
  const t = (wrapped - y0) / (y1 - y0);
  const smooth = t * t * (3 - 2 * t);
  return { x: x0 + (x1 - x0) * smooth, halfWidth: w0 + (w1 - w0) * smooth };
}

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function path(ctx, points, fill, stroke = '#787963', width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function line(ctx, points, color, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function tree(ctx, x, y, size = 9) {
  ellipse(ctx, x + size * 0.45, y + size * 0.65, size * 1.1, size * 0.72, '#3c524c40');
  ellipse(ctx, x, y + 1, size, size * 0.85, '#426b55');
  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 0.4;
    ellipse(ctx, x + Math.cos(angle) * size * 0.43, y + Math.sin(angle) * size * 0.4,
      size * 0.62, size * 0.57, i < 3 ? '#6d915d' : '#547c55');
  }
  ellipse(ctx, x - size * 0.2, y - size * 0.3, size * 0.58, size * 0.44, '#91aa6e');
  ellipse(ctx, x - size * 0.37, y - size * 0.43, size * 0.26, size * 0.2, '#b0bd7d');
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function bounds(points) {
  return {
    left: Math.min(...points.map(p => p[0])), right: Math.max(...points.map(p => p[0])),
    top: Math.min(...points.map(p => p[1])), bottom: Math.max(...points.map(p => p[1]))
  };
}

function inset(points, distance) {
  const center = points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0]);
  return points.map(p => {
    const length = Math.hypot(center[0] - p[0], center[1] - p[1]);
    return mix(p, center, Math.min(0.7, distance / length));
  });
}

const ROOFS = [
  ['#cb9068', '#a56249', '#dfac7c'],
  ['#c5845e', '#995c49', '#dda175'],
  ['#d29d77', '#ad7658', '#e3b58a'],
  ['#b77858', '#8e5849', '#cb9671'],
  ['#b8a18b', '#8e8279', '#d2bea3'],
  ['#83949a', '#5b7079', '#afbbba']
];

function roof(ctx, points, colors, random, flat = false) {
  path(ctx, points.map(([x, y]) => [x + 4, y + 6]), '#2d41464a', null);
  path(ctx, points, '#e8d1a6', '#6e655c', 1);
  let p = inset(points, 1.3);
  if (Math.hypot(p[3][0] - p[0][0], p[3][1] - p[0][1])
      > Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) * 1.15) {
    p = [p[1], p[2], p[3], p[0]];
  }
  if (flat) {
    path(ctx, p, '#9da6a0', null);
    path(ctx, inset(p, 3), '#c3c4b1', '#788780', 0.8);
    const center = mix(p[0], p[2], 0.5);
    ctx.fillStyle = '#718483';
    ctx.fillRect(center[0] - 3, center[1] - 4, 6, 8);
    ctx.fillStyle = '#dce1cb';
    ctx.fillRect(center[0] - 2, center[1] - 4, 5, 5);
  } else {
    const middleA = mix(p[0], p[3], 0.48);
    const middleB = mix(p[1], p[2], 0.48);
    const ridgeA = mix(middleA, middleB, 0.12);
    const ridgeB = mix(middleA, middleB, 0.88);
    path(ctx, [p[0], p[1], ridgeB, ridgeA], colors[0], null);
    path(ctx, [p[3], p[2], ridgeB, ridgeA], colors[1], null);
    path(ctx, [p[0], p[3], ridgeA], colors[2], null);
    path(ctx, [p[1], p[2], ridgeB], colors[1], null);
    line(ctx, [ridgeA, ridgeB], colors[2], 1.3);
    for (let t = 0.2; t < 1; t += 0.2) {
      line(ctx, [mix(p[0], ridgeA, t), mix(p[1], ridgeB, t)], '#f7d8ac36', 0.6);
      line(ctx, [mix(p[3], ridgeA, t), mix(p[2], ridgeB, t)], '#452f3225', 0.7);
    }
    const length = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]);
    for (let t = 5 / length; t < 1; t += 5 / length) {
      line(ctx, [mix(p[0], p[1], t), mix(ridgeA, ridgeB, t)], '#633d3b20', 0.5);
    }
    if (random() < 0.7) {
      const chimney = mix(ridgeA, ridgeB, 0.2 + random() * 0.6);
      ctx.fillStyle = '#514b4866';
      ctx.fillRect(chimney[0] + 1, chimney[1] - 1, 4, 6);
      ctx.fillStyle = '#ead5ae';
      ctx.fillRect(chimney[0] - 1, chimney[1] - 4, 3, 5);
      ctx.fillStyle = '#73615a';
      ctx.fillRect(chimney[0] - 1, chimney[1] - 4, 3, 1.5);
    }
    if (random() < 0.35) {
      const skylight = mix(mix(p[0], p[1], 0.5), mix(ridgeA, ridgeB, 0.5), 0.5);
      ctx.fillStyle = '#4f7381';
      ctx.fillRect(skylight[0], skylight[1], 3, 4);
      line(ctx, [[skylight[0], skylight[1]], [skylight[0] + 3, skylight[1]]], '#d4e4d4', 0.8);
    }
  }
}

function building(ctx, x, y, w, h, color = '#b9866a', flat = false) {
  const random = randomGenerator(Math.round(x * 13 + y * 37 + w));
  roof(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], [color, '#876d61', '#e1c49b'], random, flat);
}

function landmarkX({ type, y }) {
  const { x, halfWidth } = riverAt(y);
  const bank = x - halfWidth;
  return type === 'wine' ? bank - 65 : type === 'arena' ? x + halfWidth + 106
    : type === 'cathedral' ? 160 : type === 'basilica' ? bank - 125
      : type === 'theatre' ? bank - 235 : bank - 94;
}

const SITES = LANDMARKS.filter(mark => ['wine', 'arena', 'cathedral', 'basilica', 'theatre', 'square', 'bourse'].includes(mark.type))
  .map(mark => ({
    left: landmarkX(mark) - (mark.type === 'square' ? 102 : 82),
    right: landmarkX(mark) + (mark.type === 'square' ? 102 : 82),
    top: mark.y - (mark.type === 'square' ? 125 : 94),
    bottom: mark.y + (mark.type === 'square' ? 125 : 105)
  }));

function overlapsSite(points) {
  const box = bounds(points);
  return SITES.some(site => box.left < site.right && box.right > site.left && box.top < site.bottom && box.bottom > site.top);
}

function park(ctx, points, random, formal = false) {
  path(ctx, points, '#879c73', '#a9b08a', 2);
  const inner = inset(points, 7);
  path(ctx, inner, '#91a579', null);
  const box = bounds(inner);
  ctx.save();
  path(ctx, inner, null, null);
  ctx.clip();
  const middleA = mix(inner[0], inner[1], 0.5);
  const middleB = mix(inner[3], inner[2], 0.5);
  line(ctx, [middleA, middleB], '#d8caa3', 4);
  if (formal) {
    line(ctx, [mix(inner[0], inner[3], 0.5), mix(inner[1], inner[2], 0.5)], '#d8caa3', 4);
  }
  const count = Math.floor((box.right - box.left) * (box.bottom - box.top) / 300);
  for (let i = 0; i < count; i += 1) {
    const x = box.left + random() * (box.right - box.left);
    const y = box.top + random() * (box.bottom - box.top);
    const size = 4 + random() * 9;
    if (!overlapsSite([[x - size, y - size], [x + size, y + size]])) tree(ctx, x, y, size);
  }
  ctx.restore();
}

function urbanBlock(ctx, points, random, district) {
  const outer = inset(points, 7);
  path(ctx, outer, '#d4c6a9', '#b8b09b', 1);
  const inner = inset(outer, district === 'historic' ? 58 : 40);
  path(ctx, inner, random() < 0.24 ? '#8e9c73' : '#bbae98', '#9c9b82', 1);
  const center = mix(inner[0], inner[2], 0.5);
  if (!overlapsSite(inner)) {
    tree(ctx, center[0], center[1], 6 + random() * 7);
    if (random() < 0.4) {
      line(ctx, [mix(inner[0], inner[2], 0.3), mix(inner[1], inner[3], 0.6)], '#ded2b1', 2);
    }
  }
  if (district === 'warehouse' && !overlapsSite(outer)) {
    const hall = inset(outer, 9);
    roof(ctx, hall, ROOFS[random() < 0.65 ? 5 : 3], random);
    for (let t = 0.15; t < 0.9; t += 0.15) {
      line(ctx, [mix(hall[0], hall[1], t), mix(hall[3], hall[2], t)], '#c9d6ce80', 2);
    }
    return;
  }
  for (let edge = 0; edge < 4; edge += 1) {
    const next = (edge + 1) % 4;
    const length = Math.hypot(outer[next][0] - outer[edge][0], outer[next][1] - outer[edge][1]);
    const divisions = Math.max(2, Math.floor(length / (district === 'historic' ? 21 : 29)));
    for (let i = 0; i < divisions; i += 1) {
      const start = i / divisions + 0.006;
      const end = (i + 1) / divisions - 0.006;
      const plot = [mix(outer[edge], outer[next], start), mix(outer[edge], outer[next], end),
        mix(inner[edge], inner[next], end), mix(inner[edge], inner[next], start)];
      if (overlapsSite(plot)) continue;
      const colorIndex = Math.floor(random() * (district === 'historic' ? 5 : 6));
      roof(ctx, plot, ROOFS[colorIndex], random, district === 'modern' && random() < 0.32);
    }
  }
}

function city(ctx, random) {
  ctx.fillStyle = '#c9c1aa';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  for (const side of [-1, 1]) {
    const rows = [];
    for (let y = -210; y < MAP_HEIGHT + 420; y += 118 + random() * 87) {
      const row = [];
      for (let lane = 0; lane < 8; lane += 1) {
        const py = y + lane * 13 * Math.sin(y / 800 + side) + Math.sin(lane * 0.7 + y / 650) * 22;
        const { x, halfWidth } = riverAt(py);
        const distance = 47 + lane * (98 + 15 * Math.sin(y / 450)) + Math.sin(y / 280 + lane * 1.2) * lane * 6;
        row.push([x + side * (halfWidth + distance), py]);
      }
      rows.push(row);
    }
    for (let r = 0; r < rows.length - 1; r += 1) {
      for (let lane = 0; lane < 7; lane += 1) {
        const points = [rows[r][lane], rows[r][lane + 1], rows[r + 1][lane + 1], rows[r + 1][lane]];
        const box = bounds(points);
        if (box.right < -30 || box.left > MAP_WIDTH + 30) continue;
        const y = (box.top + box.bottom) / 2;
        const historic = side === -1 && y > 2600 && y < 5450;
        const parkChance = side === 1 ? (lane === 0 ? 0.55 : 0.28) : 0.06;
        if (random() < parkChance) {
          park(ctx, inset(points, 5), random, side === -1);
        } else {
          const district = historic ? 'historic' : y < 2450 && random() < 0.55 ? 'warehouse' : 'modern';
          urbanBlock(ctx, points, random, district);
        }
      }
    }

    // Thin, connected streets, with larger avenues that follow the quay.
    for (let lane = 1; lane < 5; lane += 1) {
      const road = rows.map(row => row[lane]);
      line(ctx, road, '#b5ae9c', lane === 3 ? 15 : 8);
      line(ctx, road, '#ded5bd', lane === 3 ? 11 : 5);
      if (lane === 3) {
        ctx.setLineDash([6, 10]);
        line(ctx, road, '#f4ecd5', 1);
        ctx.setLineDash([]);
      }
    }
    for (const row of rows) {
      line(ctx, row, '#ddd1b8', 4);
      const spot = row[2];
      if (spot[0] > 15 && spot[0] < MAP_WIDTH - 15 && !overlapsSite([spot])) {
        for (const offset of [-8, 8]) {
          tree(ctx, spot[0] + offset, spot[1] - 10, 4);
        }
      }
    }
  }
  // Fine, deterministic paper/grain detail is baked once, not redrawn in the game loop.
  for (let i = 0; i < 58000; i += 1) {
    const x = random() * MAP_WIDTH;
    const y = random() * MAP_HEIGHT;
    ctx.fillStyle = i % 2 ? '#f5e6bf12' : '#514d4d0b';
    ctx.fillRect(x, y, 0.8 + random() * 2, 0.8 + random() * 2);
  }
}

function paving(ctx, points) {
  path(ctx, points, '#d7cdb5', '#b5ac96', 1);
  const box = bounds(points);
  ctx.save();
  path(ctx, points, null, null);
  ctx.clip();
  for (let y = box.top; y < box.bottom; y += 9) {
    line(ctx, [[box.left, y], [box.right, y]], '#ada58e45', 0.6);
    for (let x = box.left + (Math.round(y / 9) % 2) * 7; x < box.right; x += 14) {
      line(ctx, [[x, y], [x, y + 9]], '#f5ead140', 0.7);
    }
  }
  ctx.restore();
}

function label(ctx, text, x, y, color = '#eeead2') {
  ctx.save();
  ctx.font = '600 13px sans-serif';
  const width = ctx.measureText(text).width + 20;
  ctx.fillStyle = '#294f50e6';
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - 12, width, 25, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function bridge(ctx, { name, y, type }) {
  const river = riverAt(y);
  const left = river.x - river.halfWidth - 35;
  const right = river.x + river.halfWidth + 35;
  const width = right - left;
  ctx.save();
  ctx.translate(left, y);
  ctx.rotate(type === 'suspension' ? -0.22 : type === 'stone' ? 0.1 : -0.06);
  const deck = type === 'wide' ? 34 : type === 'road' ? 23 : 21;
  ctx.fillStyle = '#315f5b88';
  ctx.fillRect(7, 11, width, deck + 5);
  ctx.fillStyle = type === 'stone' ? '#b27858' : '#c4c6b7';
  ctx.fillRect(0, -deck / 2, width, deck);
  line(ctx, [[0, -deck / 2], [width, -deck / 2]], '#f0d7b2', 4);
  line(ctx, [[0, deck / 2], [width, deck / 2]], '#6f847e', 3);
  ctx.setLineDash([9, 8]);
  line(ctx, [[0, 0], [width, 0]], '#e8e2c6', 1.5);
  ctx.setLineDash([]);

  if (type === 'suspension') {
    for (const tx of [width * 0.23, width * 0.77]) {
      for (const side of [-1, 1]) {
        const ty = side * 16;
        ctx.fillStyle = '#c6d3c7';
        ctx.fillRect(tx - 4, ty - 28, 8, 38);
        line(ctx, [[tx - 2, ty - 28], [tx + 2, ty - 28]], '#f0ead2', 3);
      }
      line(ctx, [[tx - 4, -42], [tx - 4, -13]], '#819e96', 2);
    }
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, side * 13);
      ctx.quadraticCurveTo(width * 0.1, side * 20 - 23, width * 0.23, side * 16 - 27);
      ctx.quadraticCurveTo(width * 0.5, side * 16 + 4, width * 0.77, side * 16 - 27);
      ctx.quadraticCurveTo(width * 0.91, side * 20 - 23, width, side * 13);
      ctx.strokeStyle = '#e9e9cf';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      for (let tx = width * 0.27; tx < width * 0.75; tx += 10) {
        const sag = Math.sin((tx / width - 0.23) / 0.54 * Math.PI) * 15;
        line(ctx, [[tx, side * 16 - 25 + sag], [tx, side * 13]], '#c9d4c2', 1);
      }
    }
  } else if (type === 'lift') {
    for (const tx of [width * 0.28, width * 0.72]) {
      for (const side of [-1, 1]) {
        const ty = side * 23;
        ellipse(ctx, tx + 5, ty + 9, 10, 14, '#42665b');
        ctx.fillStyle = '#9cafa6';
        ctx.fillRect(tx - 5, ty - 29, 10, 35);
        ctx.fillStyle = '#dfdfc8';
        ctx.fillRect(tx - 5, ty - 29, 7, 31);
        ellipse(ctx, tx, ty - 29, 5, 3, '#eef0d9');
        line(ctx, [[tx, ty - 24], [tx, ty - 4]], '#7d9d96', 1);
      }
    }
    ctx.strokeStyle = '#708e87';
    ctx.strokeRect(width * 0.3, -9, width * 0.4, 18);
  } else if (type === 'stone') {
    for (let i = 0; i < 17; i += 1) {
      const tx = (i + 0.5) * width / 17;
      ctx.fillStyle = '#755846';
      ctx.beginPath();
      ctx.arc(tx, 12, width / 17 * 0.37, Math.PI, 0);
      ctx.fill();
      ellipse(ctx, tx - width / 34, 17, 3, 5, '#d7b382');
      ellipse(ctx, tx - width / 34, -13, 2, 2, '#ecdbb1');
    }
  } else if (type === 'wide') {
    ctx.fillStyle = '#d9cfb4';
    ctx.fillRect(0, -15, width, 11);
    line(ctx, [[0, -7], [width, -7]], '#edc58b', 1.5);
    for (let tx = 15; tx < width; tx += 35) {
      ctx.fillStyle = '#eee3c5';
      ctx.fillRect(tx, -13, 12, 4);
    }
  }
  ctx.restore();
  label(ctx, name, river.x, y + 57);
}

function wineMuseum(ctx, y) {
  const { x, halfWidth } = riverAt(y);
  const cx = x - halfWidth - 65;
  ctx.save();
  ctx.translate(cx, y);
  paving(ctx, [[-75, -53], [44, -97], [78, 4], [42, 52], [-73, 52]]);
  ellipse(ctx, 10, 9, 61, 43, '#686d6350');
  ctx.beginPath();
  ctx.moveTo(-47, 19);
  ctx.bezierCurveTo(-75, -11, -34, -53, -4, -37);
  ctx.bezierCurveTo(14, -30, -1, -64, 19, -76);
  ctx.bezierCurveTo(49, -91, 62, -47, 46, -15);
  ctx.bezierCurveTo(38, 9, 7, 47, -47, 19);
  ctx.closePath();
  ctx.fillStyle = '#b58e4e';
  ctx.fill();
  ctx.strokeStyle = '#87704a';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-47 + i * 5, 14 + i);
    ctx.bezierCurveTo(-65 + i * 7, -21, 21 + i * 3, -4, 17 + i * 3, -65);
    ctx.strokeStyle = i % 2 ? '#f2d89a' : '#d4b16e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ellipse(ctx, 25, -64, 16, 11, '#e4ce99');
  ellipse(ctx, 25, -66, 12, 7, '#718e8e');
  ctx.restore();
  label(ctx, 'Cité du Vin', cx, y + 65, '#ffe2a1');
}

function monument(ctx, { name, y, type }) {
  if (['suspension', 'lift', 'stone', 'road', 'wide'].includes(type)) {
    bridge(ctx, { name, y, type });
    return;
  }
  if (type === 'wine') {
    wineMuseum(ctx, y);
    return;
  }
  const cx = landmarkX({ type, y });
  ctx.save();
  ctx.translate(cx, y);
  paving(ctx, [[-81, -83], [73, -89], [83, 73], [24, 91], [-84, 79]]);
  if (type === 'square') {
    paving(ctx, [[-100, -118], [92, -118], [100, 116], [-99, 116]]);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#829871';
      ctx.fillRect(s < 0 ? -94 : 60, -107, 34, 214);
      for (let ty = -98; ty < 108; ty += 16) {
        tree(ctx, s * 82, ty, 7);
        tree(ctx, s * 65, ty, 6);
      }
    }
    for (const s of [-1, 1]) {
      line(ctx, [[s * 49, -106], [s * 49, 103]], '#eee0bf', 4);
    }
    ellipse(ctx, -8, 14, 30, 22, '#9ba897');
    ellipse(ctx, -8, 14, 25, 17, '#6d9690');
    ctx.fillStyle = '#bdc1a8';
    ctx.fillRect(-14, -40, 12, 55);
    ellipse(ctx, -8, -43, 7, 8, '#5e8e7c');
    line(ctx, [[-19, -47], [-8, -41], [3, -47]], '#497c70', 3);
  } else if (type === 'theatre') {
    building(ctx, -52, -56, 104, 104, '#9d9c91');
    ctx.fillStyle = '#686f70';
    ctx.fillRect(-39, -43, 78, 70);
    line(ctx, [[-32, -40], [0, -12], [32, -40]], '#abb6aa', 3);
    ctx.fillStyle = '#decba5';
    ctx.fillRect(-61, 43, 122, 18);
    for (let i = 0; i < 12; i += 1) {
      ellipse(ctx, -55 + i * 10, 52, 3, 4, '#f2e3bf');
      ellipse(ctx, -55 + i * 10, 39, 2, 3, '#a3a996');
    }
  } else if (type === 'bourse') {
    for (const s of [-1, 1]) {
      building(ctx, -62, s * 36 - 20, 85, 38, '#8e9690');
      building(ctx, -62, s * 28 - 14, 26, 42, '#8e9690');
      ellipse(ctx, -22, s * 35 - 8, 8, 9, '#acb4a3');
    }
    ellipse(ctx, -12, 0, 15, 11, '#a2ad96');
    ellipse(ctx, -12, 0, 10, 7, '#66968e');
    ctx.fillStyle = '#86b2ab';
    ctx.fillRect(32, -57, 34, 114);
    line(ctx, [[37, -49], [60, -39], [37, -9], [60, 2], [37, 35]], '#c5d6bb', 1);
  } else if (type === 'cathedral' || type === 'basilica') {
    building(ctx, -23, -69, 45, 122, '#718a8a');
    building(ctx, -54, -22, 107, 34, '#718a8a');
    path(ctx, [[-23, -69], [0, -79], [22, -69]], '#678185');
    for (let yy = -57; yy < 40; yy += 16) {
      line(ctx, [[-28, yy], [28, yy]], '#dfcba5', 3);
    }
    for (const tx of type === 'cathedral' ? [-13, 13] : [0]) {
      path(ctx, [[tx - 8, 39], [tx, 3], [tx + 8, 39], [tx, 47]], '#657e81', '#e3d2aa');
    }
    const towerX = 61;
    ellipse(ctx, towerX + 5, 25, 14, 11, '#a2a083');
    ctx.fillStyle = '#e3cea2';
    ctx.fillRect(towerX - 7, -16, 15, 40);
    path(ctx, [[towerX - 10, -14], [towerX, -65], [towerX + 10, -14]], '#678887', '#b5b39a');
    line(ctx, [[towerX, -69], [towerX, -58]], '#e5d7b9', 2);
  } else if (type === 'arena') {
    ctx.beginPath();
    ctx.roundRect(-67, -44, 134, 87, [32, 23, 28, 20]);
    ctx.fillStyle = '#9d9f92';
    ctx.fill();
    ctx.translate(-5, -9);
    ctx.beginPath();
    ctx.roundRect(-67, -44, 134, 87, [32, 23, 28, 20]);
    ctx.fillStyle = '#ede6cf';
    ctx.fill();
    ctx.strokeStyle = '#a4a99b';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let yy = -25; yy < 31; yy += 9) {
      line(ctx, [[-56, yy], [55, yy + 3]], '#c0c6b7', 1);
    }
    ellipse(ctx, 25, 8, 24, 16, '#dde0cd');
  }
  ctx.restore();
  label(ctx, name, cx, y + 100);
}

export function drawBordeaux(ctx) {
  const random = randomGenerator(33000);
  city(ctx, random);

  const samples = [];
  for (let y = 0; y <= MAP_HEIGHT; y += 8) samples.push({ y, ...riverAt(y) });
  const riverPath = new Path2D();
  samples.forEach(({ x, halfWidth, y }, i) => {
    if (i === 0) riverPath.moveTo(x - halfWidth, y);
    else riverPath.lineTo(x - halfWidth, y);
  });
  [...samples].reverse().forEach(({ x, halfWidth, y }) => riverPath.lineTo(x + halfWidth, y));
  riverPath.closePath();
  ctx.fillStyle = '#5c9794';
  ctx.fill(riverPath);
  ctx.strokeStyle = '#e0cba6';
  ctx.lineWidth = 17;
  ctx.stroke(riverPath);
  ctx.strokeStyle = '#60847a';
  ctx.lineWidth = 2;
  ctx.stroke(riverPath);

  ctx.save();
  ctx.clip(riverPath);
  for (let y = 14; y < MAP_HEIGHT; y += 23) {
    const { x, halfWidth } = riverAt(y);
    for (let i = 0; i < 3; i += 1) {
      const rx = x - halfWidth + 12 + random() * (halfWidth * 2 - 30);
      line(ctx, [[rx, y], [rx + 7 + random() * 18, y - 2]], '#83b3a5', 1.4);
    }
  }
  ctx.restore();

  // The quays follow both banks; planted promenades separate the city from the water.
  for (const side of [-1, 1]) {
    const quay = samples.map(({ x, halfWidth, y }) => [x + side * (halfWidth + 21), y]);
    const road = samples.map(({ x, halfWidth, y }) => [x + side * (halfWidth + 49), y]);
    line(ctx, quay, '#d8cbac', 22);
    line(ctx, quay, '#e8d9ba', 13);
    line(ctx, road, '#a0a698', 13);
    line(ctx, road, '#aeb2a3', 9);
    ctx.setLineDash([6, 11]);
    line(ctx, road, '#efe9cd', 1);
    ctx.setLineDash([]);
    for (let y = 28; y < MAP_HEIGHT; y += 28) {
      const { x, halfWidth } = riverAt(y);
      tree(ctx, x + side * (halfWidth + 32), y, 6 + random() * 2);
      if (y % 84 === 28) {
        const px = x + side * (halfWidth + 14);
        line(ctx, [[px, y], [px, y + 7]], '#96775c', 2);
        ellipse(ctx, px + 2, y + 14, 1.2, 1.8, '#d5a779');
      }
      if (random() < 0.32) {
        const carX = x + side * (halfWidth + 47);
        ctx.fillStyle = ['#ebdec3', '#5a6e78', '#b76f57'][Math.floor(random() * 3)];
        ctx.fillRect(carX - 1.5, y, 3, 6);
        ctx.fillStyle = '#3e5964';
        ctx.fillRect(carX - 1, y + 1, 2, 2);
      }
    }
  }

  // Bassins à flot, on the western bank just north of the Cité du Vin.
  ctx.fillStyle = '#d0c4a3';
  ctx.fillRect(315, 1480, 269, 335);
  ctx.fillStyle = '#527e7e';
  ctx.fillRect(338, 1502, 91, 266);
  ctx.fillRect(450, 1550, 102, 221);
  ctx.fillRect(535, 1710, 100, 25);
  for (let y = 1515; y < 1760; y += 31) {
    line(ctx, [[341, y], [365, y]], '#dbcbaa', 3);
    line(ctx, [[450, y + 50], [469, y + 50]], '#dbcbaa', 3);
  }
  for (let y = 1520; y < 1750; y += 28) {
    for (const x of [367, 399, 482, 520]) {
      path(ctx, [[x - 3, y + 10], [x - 4, y - 6], [x, y - 11], [x + 4, y - 6], [x + 3, y + 10]], '#e4dfcb', '#547a79', 0.8);
      line(ctx, [[x, y - 7], [x, y + 4]], '#8b7662', 0.8);
    }
  }
  label(ctx, 'BASSINS À FLOT', 441, 1840);

  // A few boats, with wakes, emphasize the river rather than a road.
  for (const y of [650, 2770, 4280, 5880, 7300]) {
    const { x } = riverAt(y);
    const bx = x + 23;
    path(ctx, [[bx - 7, y + 25], [bx, y - 30], [bx + 7, y + 25]], '#b6ccbb', null);
    path(ctx, [[bx - 5, y + 12], [bx - 6, y - 11], [bx, y - 19], [bx + 6, y - 11], [bx + 5, y + 12]], '#ead8b3', '#3e706d', 1);
    ctx.fillStyle = '#9b8064';
    ctx.fillRect(bx - 3, y - 9, 6, 12);
  }

  LANDMARKS.forEach(mark => monument(ctx, mark));
  for (const [text, x, y] of [
    ['BACALAN', 170, 1240], ['CHARTRONS', 259, 2940],
    ['BORDEAUX', 190, 3250], ['LA BASTIDE', 815, 3870],
    ['SAINT-MICHEL', 193, 5220], ['BÈGLES', 260, 6900], ['FLOIRAC', 830, 6190]
  ]) {
    ctx.save();
    ctx.font = '600 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#647b69';
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  const { x } = riverAt(3140);
  ctx.save();
  ctx.translate(x, 3140);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'italic 16px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d7dfbd';
  ctx.fillText('La Garonne', 0, 0);
  ctx.restore();
}

export function createCloud() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  for (const [x, y, radius] of [[95, 106, 57], [147, 80, 66], [205, 91, 74], [269, 112, 55]]) {
    const gradient = ctx.createRadialGradient(x, y, 8, x, y, radius);
    gradient.addColorStop(0, '#ffffffe6');
    gradient.addColorStop(0.5, '#ffffff99');
    gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.beginPath();
  for (const [x, y, rx, ry] of [[95, 112, 45, 24], [145, 88, 49, 39], [204, 84, 54, 44], [252, 103, 50, 31], [285, 116, 29, 18]]) {
    ctx.moveTo(x + rx, y);
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }
  const fill = ctx.createLinearGradient(0, 40, 0, 145);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, '#dfe9ef');
  ctx.fillStyle = fill;
  ctx.shadowColor = '#789eae30';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 7;
  ctx.fill();
  return canvas;
}

export class BordeauxBackground {
  constructor(scene) {
    this.offset = 0;
    this.tiles = [];
    this.clouds = [];
    this.worldHeight = MAP_HEIGHT * WORLD_SCALE;
    const tileCount = MAP_HEIGHT / TILE_HEIGHT;
    const needsMap = !scene.textures.exists('bordeaux-0');
    if (needsMap) {
      const map = document.createElement('canvas');
      map.width = MAP_WIDTH;
      map.height = MAP_HEIGHT;
      drawBordeaux(map.getContext('2d'));
      for (let i = 0; i < tileCount; i += 1) {
        const tile = document.createElement('canvas');
        tile.width = MAP_WIDTH;
        tile.height = TILE_HEIGHT;
        tile.getContext('2d').drawImage(map, 0, i * TILE_HEIGHT, MAP_WIDTH, TILE_HEIGHT, 0, 0, MAP_WIDTH, TILE_HEIGHT);
        scene.textures.addCanvas(`bordeaux-${i}`, tile);
      }
    }
    for (let i = 0; i < tileCount; i += 1) {
      const sprite = scene.add.image(0, 0, `bordeaux-${i}`).setOrigin(0).setScale(WORLD_SCALE).setDepth(-20);
      this.tiles.push(sprite);
    }
    this.veil = scene.add.rectangle(0, 0, 480, 720, 0xffffff, BACKGROUND_VEIL_ALPHA)
      .setOrigin(0).setDepth(-19);
    if (!scene.textures.exists('bordeaux-cloud')) scene.textures.addCanvas('bordeaux-cloud', createCloud());
    for (let i = 0; i < 4; i += 1) {
      this.clouds.push(scene.add.image(60 + i * 128, i * 231 - 160, 'bordeaux-cloud')
        .setScale(0.65 + i * 0.1).setAlpha(CLOUD_ALPHA).setDepth(-18));
    }
    this.update(0);
  }

  update(delta) {
    this.offset = (this.offset + SCROLL_SPEED * delta / 1000) % this.worldHeight;
    const tileWorldHeight = TILE_HEIGHT * WORLD_SCALE;
    for (let i = 0; i < this.tiles.length; i += 1) {
      const rawY = i * tileWorldHeight - (this.worldHeight - 720) + this.offset;
      const y = ((rawY + tileWorldHeight) % this.worldHeight + this.worldHeight) % this.worldHeight - tileWorldHeight;
      this.tiles[i].setY(y);
      this.tiles[i].setVisible(y < 720 && y + tileWorldHeight > 0);
    }
    for (let i = 0; i < this.clouds.length; i += 1) {
      const cloud = this.clouds[i];
      cloud.y += (43 + i * 5) * delta / 1000;
      cloud.x += Math.sin(this.offset / 170 + i) * delta * 0.004;
      if (cloud.y > 850) {
        cloud.y = -150;
        cloud.x = 50 + i * 128;
      }
    }
  }
}
