import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { ELEMENTS, ZODIAC_SIGNS } from '../src/data/zodiacData.js';

const output = fileURLToPath(new URL('../public/assets/', import.meta.url));
const force = process.argv.includes('--force');
const size = 32;
const ink = 0x151725;
const pale = 0xffefd3;
const skin = 0xd9a48f;
const metal = 0xc2ced0;
const TAU = Math.PI * 2;

function save(name, image) {
  const path = resolve(output, name);
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, PNG.sync.write(image), { flag: force ? 'w' : 'wx' });
    console.log(`Generado ${name} (${image.width}×${image.height})`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Conservado ${name}`);
  }
}

function blend(left, right, amount) {
  const channel = (shift) => Math.round(((left >> shift) & 255) * (1 - amount) + ((right >> shift) & 255) * amount);
  return channel(16) << 16 | channel(8) << 8 | channel(0);
}

// Todos los trazos se rasterizan directamente en la rejilla de 32, con
// recorte por celda para que las siluetas de una pose no invadan la siguiente.
function pen(image, column, row) {
  function dot(x, y, color, alpha = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const index = ((row * size + y) * image.width + column * size + x) * 4;
    image.data[index] = color >> 16;
    image.data[index + 1] = color >> 8 & 255;
    image.data[index + 2] = color & 255;
    image.data[index + 3] = alpha;
  }

  function rect(x, y, width, height, color, alpha = 255) {
    for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) dot(x + dx, y + dy, color, alpha);
  }

  function line(x0, y0, x1, y1, color, width = 1) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      rect(x0 + (x1 - x0) * t - (width - 1) / 2, y0 + (y1 - y0) * t - (width - 1) / 2, width, width, color);
    }
  }

  function poly(points, color, edge = null) {
    const low = Math.floor(Math.min(...points.map((point) => point[1])));
    const high = Math.ceil(Math.max(...points.map((point) => point[1])));
    for (let y = low; y <= high; y++) {
      const crossing = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay > y + 0.5) !== (by > y + 0.5)) crossing.push(ax + (bx - ax) * (y + 0.5 - ay) / (by - ay));
      }
      crossing.sort((a, b) => a - b);
      for (let i = 0; i < crossing.length; i += 2) {
        for (let x = Math.ceil(crossing[i]); x < crossing[i + 1]; x++) dot(x, y, color);
      }
    }
    if (edge !== null) points.forEach(([x, y], index) => {
      const [ex, ey] = points[(index + 1) % points.length];
      line(x, y, ex, ey, edge);
    });
  }

  function oval(x, y, rx, ry, color, edge = null) {
    for (let dy = -Math.ceil(ry); dy <= ry; dy++) {
      for (let dx = -Math.ceil(rx); dx <= rx; dx++) {
        const distance = Math.hypot(dx / rx, dy / ry);
        if (distance <= 1) dot(x + dx, y + dy, edge !== null && distance > 0.78 ? edge : color);
      }
    }
  }
  return { dot, rect, line, poly, oval };
}

function atlas(name, columns, rows, draw) {
  const image = new PNG({ width: size * columns, height: size * rows });
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) draw(pen(image, column, row), column, row);
  save(name, image);
}

const cloaks = [0xce654d, 0x70996d, 0x83a7c7, 0x58b2b3, 0xd69a58, 0x87ab67,
  0xb39ad1, 0x527cb7, 0xc07d9d, 0x91a77f, 0x84bddc, 0x729ac2];

atlas('sprites/player.png', 32, 12, (p, pose, sign) => {
  const cloth = cloaks[sign];
  const shadow = blend(cloth, ink, 0.50);
  const shine = blend(cloth, pale, 0.43);
  const walking = pose >= 6 && pose < 16;
  const attacking = pose >= 16 && pose < 23;
  const dashing = pose >= 23 && pose < 28;
  const hurt = pose >= 28;
  const cycle = walking ? (pose - 6) / 10 * TAU : pose / 6 * TAU;
  const step = walking ? Math.round(Math.sin(cycle) * 3) : 0;
  const swing = attacking ? [-3, -3, -1, 4, 7, 5, 2][pose - 16] : 0;
  const lean = dashing ? 4 : hurt ? [-3, -2, -1, 0][pose - 28] : attacking ? Math.sign(swing) : 0;
  const bob = dashing ? 2 : walking ? -Math.round(Math.abs(Math.cos(cycle))) : pose < 6 && pose > 2 ? -1 : 0;
  const x = 15 + lean;
  const y = 12 + bob;
  const hem = dashing ? 1 + pose % 3 : 8 - step;
  const fall = dashing ? 2 : Math.round(Math.sin(cycle));
  p.poly([[x - 3, y], [x + 5, y + 4], [x + 3, y + 11], [hem + 4, y + 13 - fall],
    [hem, y + 11 - fall], [hem + 3, y + 4]], shadow, ink);
  p.line(x - 4, y + 3, hem + 2, y + 10 - fall, cloth);
  p.line(x - 3, y + 4, hem + 5, y + 11 - fall, shine);
  p.line(x + 1, y + 8, 16 - step, y + 12, 0x343948, 3);
  p.line(x + 2, y + 8, 17 + step, y + 13, 0x5a5265, 3);
  p.line(15 - step, y + 13, 17 - step, y + 13, ink, 2);
  p.line(16 + step, y + 14, 18 + step, y + 14, ink, 2);
  p.poly([[x - 3, y + 1], [x + 3, y - 1], [x + 5, y + 3], [x + 3, y + 9], [x - 3, y + 8]], cloth, ink);
  p.line(x - 2, y + 3, x - 1, y + 6, shine);
  p.line(x - 1, y + 6, x + 3, y + 7, 0x52444f);
  p.dot(x + 2, y + 7, 0xcbb291);
  p.poly([[x - 6, y - 3], [x - 4, y - 6], [x, y - 8], [x + 4, y - 6],
    [x + 6, y - 2], [x + 3, y + 1], [x - 3, y + 1]], cloth, ink);
  p.line(x - 4, y - 4, x, y - 7, shine);
  p.line(x - 3, y - 1, x + 2, y - 4, shadow);
  p.poly([[x + 1, y - 3], [x + 5, y - 2], [x + 4, y], [x + 1, y]], skin, ink);
  p.dot(x + 3, y - 2, pale);
  const handX = x + 5 + (attacking ? swing : walking ? Math.round(step / 2) : 0);
  const handY = y + (attacking ? 4 - Math.round(swing / 2) : 6);
  p.line(x + 3, y + 2, handX, handY, shadow, 3);
  p.line(x + 4, y + 2, handX, handY, shine);
  p.dot(handX, handY, skin);
  if (attacking) {
    const color = ELEMENTS[ZODIAC_SIGNS[sign].element].color;
    p.line(handX - 1, handY + 2, handX + 3, handY - 4, color);
    p.dot(handX + 3, handY - 4, pale);
    if (swing >= 4) p.line(handX + 1, handY - 6, handX + 5, handY - 2, shine);
  }
  if (dashing) {
    p.line(2, y + 5, 9 - pose % 3, y + 5, cloth);
    p.line(3 + pose % 3, y + 9, 10, y + 9, shine);
  }
});

// Cada enemigo y jefe ocupa ocho poses: cuatro de locomoción, tres de
// ataque y una de impacto. El elemento cambia material y silueta.
const monsterColors = [0xcf735b, 0xa49b68, 0x9f9fcd, 0x62aab9];
function bossRegalia(p, variant, x, y, pose, shine, element) {
  const wave = [0, -1, -2, -1, 0, 1, 2, 1][pose];
  switch (variant) {
    case 0:
      p.poly([[x-8,y-6],[x-12,y-9],[x-13,y-13],[x-9,y-12],[x-5,y-9]], shine, ink);
      p.poly([[x+5,y-8],[x+11,y-13],[x+12,y-10],[x+9,y-6]], shine, ink);
      break;
    case 1:
      p.oval(x-8, y, 5.6, 4.8, element, shine);
      p.oval(x+8, y, 5.6, 4.8, element, shine);
      break;
    case 2:
      p.oval(x-7, y-9+wave, 3.5, 5, element, shine);
      p.oval(x+8, y-8-wave, 3.5, 5, shine, ink);
      break;
    case 3:
      p.oval(x, y+1, 12.8, 8.5, element, shine);
      p.line(x-11,y-1,x-8,y-5,ink,2);
      p.line(x+7,y-5,x+11,y-1,shine,2);
      break;
    case 4:
      for (let spoke = 0; spoke < 10; spoke++) {
        const angle = spoke * TAU / 10;
        p.line(x + Math.cos(angle) * 6, y-4 + Math.sin(angle) * 6,
          x + Math.cos(angle) * (10 + spoke % 2), y-4 + Math.sin(angle) * (9 + wave / 2), shine, 2);
      }
      break;
    case 5:
      p.line(x-7,y+5,x-11,y+10,element,2);
      p.line(x-7,y+5,x-13,y+1,shine);
      p.line(x+6,y-5,x+10,y-13,element,2);
      p.dot(x+10,y-13,pale);
      break;
    case 6:
      for (const side of [-1, 1]) {
        p.poly([[x + 5 * side,y-1],[x + 12 * side,y-7+wave],[x + 10 * side,y+4],[x + 7 * side,y+8]], shine, ink);
      }
      break;
    case 7:
      p.line(x-5,y+5,x-11,y-1,element,3);
      p.line(x-11,y-1,x-10,y-8+wave,shine,2);
      p.line(x-10,y-8+wave,x-5,y-11,element,2);
      p.line(x-5,y-11,x-3,y-9,pale);
      break;
    case 8:
      p.oval(x+7,y-2,6.6,11.4,element,shine);
      p.line(x+6,y-12,x+6,y+8,pale);
      break;
    case 9:
      p.poly([[x-11,y+4],[x-11,y-3],[x-8,y-9],[x-5,y-5],[x-4,y+5]], element, shine);
      p.poly([[x+6,y+4],[x+7,y-5],[x+11,y-10],[x+13,y+3]], element, shine);
      break;
    case 10:
      p.oval(x-8,y+3+wave,5.5,6.5,element,shine);
      p.line(x-10,y-4+wave,x-6,y-4+wave,pale);
      break;
    case 11:
      p.poly([[x-4,y+2],[x-12,y-7],[x-10,y+4],[x-14,y+10+wave],[x-6,y+9]], shine, ink);
      p.line(x+5,y-4,x+11,y-8-wave,element,2);
      break;
  }
}

function creature(p, kind, row, pose, boss = false, variant = 0) {
  const element = monsterColors[row];
  const armor = blend(element, ink, 0.35);
  const shine = blend(element, pale, 0.49);
  const walk = [0, -2, 0, 2][pose % 4];
  const strike = pose >= 4 && pose <= 6 ? (pose - 4) * 2 : 0;
  const lean = pose === 7 ? -2 : Math.floor(strike / 2);
  const body = boss ? 8 : kind === 0 ? (row === 1 ? 7 : 6) : 5;
  const y = 15 + (pose === 1 || pose === 3 ? -1 : 0);
  const x = 15 + lean;
  if (boss) bossRegalia(p, variant, x, y, pose, shine, element);
  if (kind === 2 && row === 2) {
    p.poly([[x, y - 10], [x + 7, y - 1], [x + 3, y + 7], [x - 4, y + 10], [x - 8, y + 2]], armor, ink);
    p.line(x - 7, y + 2, x + 7, y - 2, shine);
    p.line(x - 6, y + 5, x + 3, y + 5, element);
  } else {
    p.line(x - 3, y + 4, x - 4 - walk, y + 10, ink, 3);
    p.line(x + 3, y + 4, x + 4 + walk, y + 9, armor, 3);
    p.poly([[x - body - 2, y + 3], [x - body, y - 3], [x, y - 8], [x + body - 1, y - 5],
      [x + body, y + 5], [x + 1, y + 9], [x - body, y + 7]], armor, ink);
    p.poly([[x - body + 1, y - 2], [x, y - 5], [x + body - 1, y - 3], [x + body - 3, y + 2], [x - 4, y + 4]], element, null);
    p.line(x - body, y, x - body - 1, y + 5, shine);
    p.line(x - 4, y + 4, x + 4, y + 4, ink);
  }
  const crest = boss ? variant % 3 : kind;
  if (crest === 0) {
    p.poly([[x - 6, y - 5], [x - 9, y - 9], [x - 8, y - 13], [x - 4, y - 8],
      [x + 4, y - 8], [x + 8, y - 11], [x + 6, y - 5]], shine, ink);
  } else if (crest === 1) {
    p.poly([[x - 5, y - 6], [x - 7, y - 12], [x - 1, y - 9], [x + 2, y - 13], [x + 7, y - 8], [x + 5, y - 5]], element, ink);
  } else {
    p.poly([[x - 5, y - 7], [x - 2, y - 12], [x + 4, y - 10], [x + 6, y - 6]], shine, ink);
  }
  p.rect(x - 3, y - 5, 7, 3, ink);
  p.rect(x + 1, y - 4, 3, 1, pale);
  if (kind === 0) {
    p.line(x + 5, y + 2, x + 8 + strike, y - 5, ink, 3);
    p.line(x + 6, y + 1, x + 9 + strike, y - 7, metal);
    p.dot(x + 8 + strike, y - 7, pale);
  } else if (kind === 1) {
    p.line(x + 4, y, x + 10 + strike, y - 1, ink, 3);
    p.line(x + 4, y, x + 12 + strike, y - 1, shine);
    p.line(x + 9, y - 5, x + 10, y + 3, element);
  } else {
    const orbit = (pose % 4) * Math.PI / 2;
    p.oval(x + 8 + Math.cos(orbit) * 3, y - 1 + Math.sin(orbit) * 4, 2.5, 2.5, shine, ink);
    p.dot(x + 8 + Math.cos(orbit) * 3, y - 1 + Math.sin(orbit) * 4, pale);
  }
  if (boss) {
    const trim = [0xebbd82, 0xbac6ab, 0xddb4dc, 0xb1e3e3][row];
    p.line(x - body + 1, y + 5, x + body - 1, y + 5, trim);
    p.line(x - body + 3, y + 6, x + 1, y + 8, element);
    p.dot(x + 2, y - 2, trim);
  }
  if (pose === 7) p.line(x - 7, y + 4, x + 6, y - 8, pale);
}
const biomeOrder = ['fire', 'earth', 'air', 'water'];
atlas('sprites/enemies.png', 8, 12, (p, pose, index) => creature(p, index % 3, Math.floor(index / 3), pose));
atlas('sprites/bosses.png', 8, 12, (p, pose, index) => {
  const sign = ZODIAC_SIGNS[index];
  creature(p, [0, 0, 1, 2, 0, 2, 1, 0, 1, 0, 2, 2][index], biomeOrder.indexOf(sign.element), pose, true, index);
});

function shard(p, x, y, radius, color, highlight, skew = 0) {
  p.poly([[x - radius, y], [x + skew, y - radius * 0.62], [x + radius, y], [x - skew, y + radius * 0.62]], color);
  p.line(x - radius + 1, y, x + radius - 1, y, highlight);
}

const spells = ['ember', 'shield', 'razor', 'wave', 'flare', 'totem', 'boomerang', 'needle', 'meteor', 'trap', 'ring', 'orb'];
atlas('sprites/projectiles.png', 4, 28, (p, phase, index) => {
  const hostile = index < 16;
  const sign = ZODIAC_SIGNS[index - 16];
  const color = hostile ? [0xff886f, 0xe6a575, 0xeab3f0, 0xa7c5f7][Math.floor(index / 4)] : ELEMENTS[sign.element].color;
  const low = blend(color, ink, 0.36);
  const high = blend(color, pale, 0.77);
  const type = hostile ? ['needle', 'orb', 'razor', 'ring'][index % 4] : spells[index - 16];
  const drift = phase === 1 ? -1 : phase === 3 ? 1 : 0;
  switch (type) {
    case 'ember':
      p.poly([[3, 18], [11, 16], [6, 13 + drift], [17, 15], [22, 12], [27, 16], [25, 19], [16, 21], [10, 20]], low);
      p.poly([[10, 18], [21, 14], [26, 16], [23, 19]], color);
      p.line(16, 18, 24, 16, high);
      break;
    case 'needle':
      p.poly([[3, 16], [17, 14], [24, 14], [29, 16], [24, 18], [9, 17]], color);
      p.line(10, 16, 27, 16, high);
      p.dot(7 - phase, 17 + drift, low);
      break;
    case 'razor':
    case 'boomerang': {
      const bend = type === 'razor' ? 4 : 7;
      p.poly([[8, 14 - bend], [23, 11], [25, 15], [22, 20], [8, 17 + bend], [18, 16]], color);
      p.line(14, 10 - bend / 2, 23, 11, high);
      p.line(23, 11, 25, 15, high);
      p.line(25, 15, 22, 20, low);
      break;
    }
    case 'meteor':
      p.poly([[2, 10 + drift], [14, 13], [8, 20], [24, 23], [29, 16], [22, 10]], low);
      p.oval(22, 16, 6.5, 5.5, color);
      p.oval(23, 15, 3.5, 3.5, high);
      p.line(10, 16 + drift, 18, 17, color);
      break;
    case 'orb':
      p.oval(17, 16, 6.5, 6.5, low);
      shard(p, 18, 16, 6, color, high, drift);
      p.line(15, 12, 19, 11, high);
      p.dot(19, 20, high);
      break;
    case 'ring':
      for (let i = 0; i < 8; i++) {
        const angle = (i + phase / 4) * TAU / 8;
        p.oval(16 + Math.cos(angle) * 7, 16 + Math.sin(angle) * 7, 2.2, 1.6, i % 2 ? color : high);
      }
      break;
    case 'totem':
      p.poly([[10, 22], [12, 16], [12, 10], [17, 7], [21, 11], [23, 23], [18, 25]], low, ink);
      p.line(14, 12, 18, 9, high);
      p.line(15, 15, 18, 15 + drift, color);
      p.dot(17, 12 + drift, pale);
      break;
    case 'trap':
      p.poly([[8, 16], [16, 8], [24, 16], [16, 24]], color, high);
      shard(p, 16, 16, 5 + drift, low, high);
      break;
    default:
      for (let i = 0; i < 3; i++) {
        const length = type === 'shield' ? 6 + i * 2 : 8 + i * 2;
        p.line(8 + i * 2, 17 - i * 3, 8 + i * 2 + length, 16 - i * 3 + drift, i === 1 ? high : color);
        p.line(17 + i * 2, 17 + i, 20 + i * 2, 18 + i, low);
      }
  }
  for (let i = 0; i < 3; i++) {
    p.dot(4 + i * 3 - phase, 14 + ((i * 3 + phase) % 7), i % 2 ? high : low);
  }
});

const stonePalettes = [
  [0x30232a, 0x57353a, 0x8f625f, 0x6c3030, 0xd36242],
  [0x28302a, 0x46553f, 0x859176, 0x4b6247, 0x98aa6b],
  [0x2a293b, 0x434963, 0x878ba6, 0x424e71, 0x99b8ed],
  [0x21323c, 0x365363, 0x7099a0, 0x255363, 0x65b5c3],
];
atlas('tilesets/gothic_dungeon_tileset.png', 10, 4, (p, tile, biome) => {
  const [floor, dark, trim, terrain, energy] = stonePalettes[biome];
  const seam = blend(floor, ink, 0.5);
  const dust = blend(floor, trim, 0.28);
  if (tile === 5) {
    p.poly([[4, 29], [4, 13], [8, 6], [14, 3], [20, 4], [26, 9], [28, 15], [28, 29]], dark, ink);
    p.poly([[9, 28], [9, 14], [13, 10], [19, 9], [23, 15], [23, 28]], ink, trim);
    p.line(6, 28, 26, 28, trim);
    p.dot(16, 7, energy);
    return;
  }
  p.rect(0, 0, 32, 32, tile >= 8 ? terrain : floor);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const grain = (x * 47 + y * 23 + x * y * 9 + tile * 91) % 85;
    if (grain < 5) p.dot(x, y, dust);
    else if (grain > 79) p.dot(x, y, seam);
  }
  if (tile === 2) {
    p.rect(0, 0, 32, 25, dark);
    p.rect(1, 1, 30, 1, trim);
    p.rect(0, 2, 1, 23, trim);
    p.rect(0, 25, 32, 3, seam);
    p.rect(0, 28, 32, 4, ink);
    for (let y = 6; y < 25; y += 6) {
      p.line(1, y, 30, y, seam);
      if (biome === 2) p.line(y + 1, 2, y + 1, 24, trim);
      else p.line((y * 3) % 18 + 5, y + 1, (y * 3) % 18 + 5, y + 5, trim);
    }
    return;
  }
  if (tile >= 8) {
    const phase = tile - 8;
    const flow = phase ? energy : blend(energy, floor, 0.57);
    for (let i = 0; i < 4; i++) {
      if (biome === 0) {
        const y = 3 + i * 7;
        p.line(0, y + phase, 10, y + 4, flow);
        p.line(10, y + 4, 24, y + 1, flow);
        p.line(24, y + 1, 31, y + 4 - phase, flow);
      } else {
        const x = 2 + i * 5 + phase * 3;
        const y = 6 + i * 5;
        p.line(x, y, x + 9, y, flow);
        p.line(x + 9, y, x + 4, y + (biome === 2 ? 4 : 2), flow);
      }
    }
    return;
  }
  p.line(0, 31, 31, 31, seam);
  p.line(31, 0, 31, 31, seam);
  if (tile === 3) {
    p.line(7, 0, 13, 12, seam);
    p.line(13, 12, 11, 19, seam);
    p.line(11, 19, 18, 31, seam);
    p.line(12, 12, 19, 14, dust);
  } else if (tile === 4 || tile === 7) {
    p.poly([[5, 17], [16, 6], [27, 17], [16, 27]], dark, trim);
    shard(p, 16, 17, 6, energy, trim);
  } else if (tile === 6) {
    for (let i = 0; i < 5; i++) p.oval(4 + i * 5, 8 + (i * 11) % 18, 2.5, 1.3, dust, seam);
  } else if (biome === 2 || biome === 3) {
    p.line(4, 16, tile === 1 ? 26 : 15, 16, dust);
  }
});

// Los iconos zodiacales se reservan para los menús y el historial.
const iconPaths = [
  [[7,10],[10,8],[14,12],[16,23],[18,12],[22,8],[25,10]],
  [[8,8],[11,12],[22,12],[25,8]], [[9,8],[23,8],[19,10],[19,23],[23,25],[9,25],[13,22],[13,9]],
  [[8,16],[11,11],[23,11],[25,15],[20,13],[11,13],[8,16],[12,21],[23,21]],
  [[7,18],[11,14],[14,18],[11,22],[7,18],[12,10],[19,9],[21,15],[18,22],[23,24]],
  [[8,22],[8,10],[12,9],[13,21],[13,11],[17,9],[19,12],[19,21],[23,16],[25,19],[21,24]],
  [[7,18],[13,18],[13,14],[16,11],[19,14],[19,18],[25,18],[25,23],[7,23]],
  [[8,21],[8,11],[12,9],[13,21],[13,11],[17,9],[18,12],[18,19],[24,24],[26,21]],
  [[8,23],[23,8],[16,8],[23,8],[23,15],[23,8],[12,19],[10,14],[17,21]],
  [[7,12],[11,9],[14,19],[17,10],[21,11],[20,20],[25,22],[22,26],[18,25]],
  [[7,13],[11,10],[14,13],[18,10],[21,13],[25,10],[25,17],[21,20],[18,17],[14,20],[11,17],[7,20]],
  [[9,8],[13,12],[13,21],[9,25],[23,8],[19,12],[19,21],[23,25],[25,16],[7,16]],
];
atlas('ui/icons_zodiac.png', 12, 1, (p, index) => {
  const color = ELEMENTS[ZODIAC_SIGNS[index].element].color;
  p.oval(16, 16, 14, 14, 0x27293a, blend(color, ink, 0.40));
  const points = iconPaths[index];
  for (let i = 1; i < points.length; i++) p.line(...points[i - 1], ...points[i], color);
});
for (const [name, fill, border] of [
  ['panel', 0x252637, 0x65687b], ['button', 0x333444, 0x85829c],
]) {
  atlas(`ui/${name}_nineslice.png`, 1, 1, (p) => {
    p.rect(1, 1, 30, 30, ink);
    p.rect(3, 3, 26, 26, border);
    p.rect(4, 4, 24, 24, fill);
    p.line(6, 5, 25, 5, blend(border, fill, 0.35));
    for (const [x, y] of [[3, 3], [28, 3], [3, 28], [28, 28]]) p.dot(x, y, 0xd0af8d);
  });
}
