import { ELEMENTS } from '../data/zodiacData.js';

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
const zoneTints = { magma: 0xc18d77, storm: 0x988bc5 };
const pick = (values, random) => values[Math.floor(random() * values.length)];

// Cuadrícula pequeña de habitaciones conectadas. La primera expansión escoge
// una arista de la frontera, lo que garantiza una ruta a cada sala.
export function generateFloor(element, floorIndex, random = Math.random) {
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
  const roomCount = Math.min(8, 5 + floorIndex);
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
  for (const room of rooms.values()) room.tiles = createRoomTiles(room, floorIndex);
  return { element, rooms, startId: start.id };
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

function createRoomTiles(room, floorIndex) {
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
    // Bloques dispersos en los cuadrantes. La cruz central, el perímetro
    // transitable y los puntos de aparición dejan paso entre todas las puertas.
    const blocks = [[6, 3], [17, 3], [7, 8], [16, 8], [5, 7], [18, 7]];
    for (let index = 0; index < 2 + Math.min(2, floorIndex); index++) {
      const [column, row] = blocks.splice(Math.floor(random() * blocks.length), 1)[0];
      tiles[row][column] = 2;
    }
  }
  return tiles;
}

export function createRoomRenderer(scene, room, element) {
  const sprites = [];
  const baseTint = ELEMENTS[element]?.roomTint ?? zoneTints[element];
  room.tiles.forEach((row, y) => row.forEach((frame, x) => {
    const sprite = scene.add.image(ROOM_LEFT + TILE_SIZE * (x + 0.5), ROOM_TOP + TILE_SIZE * (y + 0.5), 'tiles', frame);
    sprites.push(sprite);
  }));
  const doorSprites = Object.keys(room.doors).map((direction) => {
    const door = ROOM_DOORS[direction];
    const rotation = { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 }[direction];
    return scene.add.image(door.x, door.y, 'tiles', 5).setRotation(rotation).setDepth(1);
  });
  return {
    sprites,
    doorSprites,
    baseTint,
    light(time, player) {
      // Los tiles cercanos recuperan luminosidad. Las variaciones de base
      // y distancia cambian como máximo diez veces por segundo desde GameScene.
      const pulse = 0.88 + 0.08 * Math.sin(time / 850);
      for (const sprite of sprites) {
        const distance = Math.hypot(sprite.x - player.x, sprite.y - player.y);
        const strength = 0.76 + pulse * 0.62 * Math.max(0, 1 - distance / 190);
        const red = Math.min(255, Math.round(((baseTint >> 16) & 255) * strength));
        const green = Math.min(255, Math.round(((baseTint >> 8) & 255) * strength));
        const blue = Math.min(255, Math.round((baseTint & 255) * strength));
        sprite.setTint((red << 16) | (green << 8) | blue);
      }
    },
    showDoors(open) {
      for (const sprite of doorSprites) sprite.setTint(open ? 0xffe4be : 0x7e5359);
    },
    destroy() {
      for (const sprite of [...sprites, ...doorSprites]) sprite.destroy();
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
