import { POWER_BY_ID, primaryElement } from '../data/elementalPowers.js';

export const TILE_SIZE = 16;
export const ROOM_COLUMNS = 24;
export const ROOM_ROWS = 12;
export const ROOM_LEFT = 48;
export const ROOM_TOP = 55;
export const ROOM_RIGHT = ROOM_LEFT + ROOM_COLUMNS * TILE_SIZE;
export const ROOM_BOTTOM = ROOM_TOP + ROOM_ROWS * TILE_SIZE;
export const ROOM_CENTER = { x: ROOM_LEFT + ROOM_COLUMNS * TILE_SIZE / 2, y: ROOM_TOP + ROOM_ROWS * TILE_SIZE / 2 };

const directions = {
  north: { dx: 0, dy: -1, opposite: 'south' },
  east: { dx: 1, dy: 0, opposite: 'west' },
  south: { dx: 0, dy: 1, opposite: 'north' },
  west: { dx: -1, dy: 0, opposite: 'east' },
};
export const ROOM_DOORS = {
  north: { x: ROOM_CENTER.x, y: ROOM_TOP + 8, entryX: ROOM_CENTER.x, entryY: ROOM_TOP + 34 },
  east: { x: ROOM_RIGHT - 8, y: ROOM_CENTER.y, entryX: ROOM_RIGHT - 34, entryY: ROOM_CENTER.y },
  south: { x: ROOM_CENTER.x, y: ROOM_BOTTOM - 8, entryX: ROOM_CENTER.x, entryY: ROOM_BOTTOM - 34 },
  west: { x: ROOM_LEFT + 8, y: ROOM_CENTER.y, entryX: ROOM_LEFT + 34, entryY: ROOM_CENTER.y },
};

export const BIOME_ART = ['fire', 'earth', 'air', 'water'];
const terrainLayouts = {
  fire: { blocks: [[6, 3], [17, 8], [6, 8]], terrain: [[7, 4], [8, 4], [9, 4], [15, 7], [16, 7], [17, 7], [18, 7]] },
  earth: { blocks: [[5, 3], [6, 3], [17, 3], [18, 3], [5, 8], [6, 8], [17, 8], [18, 8]], terrain: [] },
  air: { blocks: [[6, 8], [17, 3]], terrain: [[8, 3], [8, 4], [8, 7], [8, 8], [15, 3], [15, 4], [15, 7], [15, 8]] },
  water: { blocks: [[6, 3], [17, 8], [17, 3]], terrain: [[5, 6], [6, 6], [7, 6], [8, 6], [7, 7], [8, 7], [15, 5], [16, 5], [17, 5], [18, 5], [15, 4], [16, 4]] },
};

const pick = (values, random) => values[Math.floor(random() * values.length)];

// Cuadrícula pequeña de habitaciones conectadas. La primera expansión escoge
// una arista de la frontera, lo que garantiza una ruta a cada sala.
export function generateFloor(element, floorIndex, random = Math.random) {
  const biome = primaryElement(element);
  const rooms = new Map();
  const attach = (x, y, distance) => {
    const room = {
      id: `${x},${y}`, x, y, distance, doors: {}, kind: 'combat', cleared: false, visited: false,
      decorationSeed: Math.floor(random() * 0x100000000) >>> 0,
    };
    rooms.set(room.id, room);
    return room;
  };
  const start = attach(0, 0, 0);
  start.kind = 'entry';
  start.cleared = true;
  const roomCount = Math.min(9, 6 + floorIndex);
  while (rooms.size < roomCount) {
    const frontier = [];
    for (const room of rooms.values()) {
      for (const [direction, { dx, dy }] of Object.entries(directions)) {
        const x = room.x + dx;
        const y = room.y + dy;
        if (!rooms.has(`${x},${y}`)) frontier.push({ room, direction, x, y });
      }
    }
    const { room, direction, x, y } = pick(frontier, random);
    const next = attach(x, y, room.distance + 1);
    room.doors[direction] = next.id;
    next.doors[directions[direction].opposite] = room.id;
  }
  const leaves = [...rooms.values()].filter((room) => room !== start && Object.keys(room.doors).length === 1);
  const maxDistance = Math.max(...leaves.map((room) => room.distance));
  pick(leaves.filter((room) => room.distance === maxDistance), random).kind = 'boss';
  for (const room of rooms.values()) room.tiles = createRoomTiles(room, biome, floorIndex);
  return { element, biome, rooms, startId: start.id, requiredClears: floorIndex < 2 ? 2 : 3 };
}

export function oppositeDoor(direction) {
  return directions[direction].opposite;
}

function roomRandom(seed) {
  // El estado local mantiene la misma decoración al volver a una sala visitada.
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function isDoorTile(room, column, row) {
  const middleColumn = ROOM_COLUMNS / 2;
  const middleRow = ROOM_ROWS / 2;
  if (column === middleColumn - 1 || column === middleColumn) {
    return Boolean((row === 0 && room.doors.north) || (row === ROOM_ROWS - 1 && room.doors.south));
  }
  if (row === middleRow - 1 || row === middleRow) {
    return Boolean((column === 0 && room.doors.west) || (column === ROOM_COLUMNS - 1 && room.doors.east));
  }
  return false;
}

function createRoomTiles(room, biome, floorIndex) {
  const random = roomRandom(room.decorationSeed);
  const tiles = Array.from({ length: ROOM_ROWS }, (_, row) => Array.from({ length: ROOM_COLUMNS }, (_, column) => {
    const border = column === 0 || row === 0 || column === ROOM_COLUMNS - 1 || row === ROOM_ROWS - 1;
    if (border && !isDoorTile(room, column, row)) return 2;
    return pick([0, 0, 1, 1, 3, 6], random);
  }));
  if (room.kind === 'boss') {
    tiles[ROOM_ROWS / 2][ROOM_COLUMNS / 2] = 7;
  } else if (room.kind === 'entry') {
    tiles[ROOM_ROWS / 2][ROOM_COLUMNS / 2] = 4;
  } else {
    const layout = terrainLayouts[biome];
    const mirror = random() < 0.5;
    const place = (positions, frame) => {
      for (const [column, row] of positions) tiles[row][mirror ? ROOM_COLUMNS - 1 - column : column] = frame;
    };
    const count = biome === 'earth' ? 6 + Math.min(2, floorIndex) : layout.blocks.length;
    place(layout.blocks.slice(0, count), 2);
    place(layout.terrain, 8);
  }
  return tiles;
}

export function terrainAt(room, x, y) {
  const column = Math.floor((x - ROOM_LEFT) / TILE_SIZE);
  const row = Math.floor((y - ROOM_TOP) / TILE_SIZE);
  return room.tiles[row]?.[column] === 8;
}

export function lavaPhase(time) {
  return Math.floor(time % 2200 / 440);
}

function softenTint(color) {
  const soften = (shift) => Math.round(112 + ((color >> shift) & 255) * 0.5);
  return (soften(16) << 16) | (soften(8) << 8) | soften(0);
}

export function createRoomRenderer(scene, room, element) {
  const sprites = [];
  const biome = primaryElement(element);
  const atlasOffset = BIOME_ART.indexOf(biome) * 10;
  const baseTint = POWER_BY_ID[element] ? softenTint(POWER_BY_ID[element].color) : 0xffffff;
  room.tiles.forEach((row, y) => row.forEach((frame, x) => {
    const sprite = scene.add.image(ROOM_LEFT + TILE_SIZE * (x + 0.5), ROOM_TOP + TILE_SIZE * (y + 0.5), 'tiles', atlasOffset + frame)
      .setDisplaySize(TILE_SIZE, TILE_SIZE);
    sprites.push({ sprite, frame });
  }));
  const doorSprites = Object.keys(room.doors).map((direction) => {
    const door = ROOM_DOORS[direction];
    const rotation = { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 }[direction];
    return [direction, scene.add.image(door.x, door.y, 'tiles', atlasOffset + 5).setDisplaySize(TILE_SIZE, TILE_SIZE).setRotation(rotation).setDepth(1)];
  });
  const wallTint = 0xe4d4d6;
  return {
    sprites,
    doorSprites,
    baseTint,
    light(time, player) {
      // Los tiles cercanos recuperan luminosidad. Las variaciones de base
      // y distancia cambian como máximo diez veces por segundo desde GameScene.
      const pulse = 0.88 + 0.08 * Math.sin(time / 850);
      for (const { sprite, frame } of sprites) {
        if (frame === 8) {
          const active = biome === 'fire' ? lavaPhase(time) >= 3 : Math.floor(time / 330) % 2;
          sprite.setFrame(atlasOffset + (active ? 9 : 8));
          continue;
        }
        if (frame === 2) {
          sprite.setTint(wallTint);
          continue;
        }
        const distance = Math.hypot(sprite.x - player.x, sprite.y - player.y);
        const strength = 0.87 + pulse * 0.27 * Math.max(0, 1 - distance / 190);
        const red = Math.min(255, Math.round(((baseTint >> 16) & 255) * strength));
        const green = Math.min(255, Math.round(((baseTint >> 8) & 255) * strength));
        const blue = Math.min(255, Math.round((baseTint & 255) * strength));
        sprite.setTint((red << 16) | (green << 8) | blue);
      }
    },
    showDoors(open, locked) {
      for (const [direction, sprite] of doorSprites) {
        sprite.setTint(locked(direction) ? 0xd36054 : open ? 0xffe4be : 0x7e5359);
      }
    },
    destroy() {
      for (const { sprite } of sprites) sprite.destroy();
      for (const [, sprite] of doorSprites) sprite.destroy();
    },
  };
}

export function isBlocked(room, x, y, radius = 0) {
  const left = Math.floor((x - radius - ROOM_LEFT) / TILE_SIZE);
  const right = Math.floor((x + radius - ROOM_LEFT) / TILE_SIZE);
  const top = Math.floor((y - radius - ROOM_TOP) / TILE_SIZE);
  const bottom = Math.floor((y + radius - ROOM_TOP) / TILE_SIZE);
  if (left < 0 || right >= ROOM_COLUMNS || top < 0 || bottom >= ROOM_ROWS) return true;
  for (let row = top; row <= bottom; row++) {
    for (let column = left; column <= right; column++) {
      if (room.tiles[row][column] === 2 || (!room.cleared && isDoorTile(room, column, row))) return true;
    }
  }
  return false;
}
