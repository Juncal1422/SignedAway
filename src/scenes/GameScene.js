import Phaser from 'phaser';
import { ZODIAC_SIGNS } from '../data/zodiacData.js';
import { HYBRID_BOSS_SIGNS } from '../data/enemiesData.js';
import { MAX_MODIFIER_STACKS, SPELL_MODIFIERS } from '../data/spellModifiers.js';
import { unlockFloorReward } from '../systems/GeneticSystem.js';
import { saveSystem } from '../systems/SaveSystem.js';
import {
  createRoomRenderer, generateFloor, isBlocked, oppositeDoor, ROOM_CENTER, ROOM_DOORS,
} from '../systems/MapGenerator.js';
import { Player } from '../entities/Player.js';
import { Projectile } from '../entities/Projectile.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';

// Espacio lógico común para todas las salas. Los planos definen los muros,
// la escena se ocupa de orquestar oleadas, transiciones y recompensas.
const spawnOffsets = [
  [-119, -45], [119, -45], [-119, 45], [119, 45], [-72, 0], [72, 0], [0, -48], [0, 48],
];
const archetypes = ['melee', 'ranged', 'elemental'];

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create({ build, route }) {
    this.route = route;
    this.build = build;
    this.floorIndex = 0;
    this.floorsCleared = 0;
    this.elapsed = 0;
    this.nextLight = 0;
    this.freeze = 0;
    this.modal = null;
    this.roomView = null;
    this.resetEffects = new Set();
    this.enemies = [];
    this.projectiles = [];
    this.actions = [];
    this.canTint = this.game.renderer.type === Phaser.WEBGL;
    this.random = Math.random;
    this.player = new Player(this, build, ROOM_CENTER.x, ROOM_CENTER.y);
    this.input.keyboard.addKey('ESC', true).on('down', () => this.togglePause());
    this.beginFloor();
    this.scene.launch('hud', { world: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scene.isActive('hud')) this.scene.stop('hud');
    });
  }

  get hud() { return this.scene.get('hud'); }

  beginFloor() {
    this.floor = generateFloor(this.route[this.floorIndex], this.floorIndex, this.random);
    this.rewardCount = 0;
    this.enterRoom(this.floor.startId);
    if (this.scene.isActive('hud')) this.hud.renderFloor();
  }

  enterRoom(id, entryDoor) {
    this.clearRoomObjects();
    this.room = this.floor.rooms.get(id);
    this.room.visited = true;
    this.roomView = createRoomRenderer(this, this.room, this.floor.element);
    this.roomView.showDoors(this.room.cleared);
    const door = ROOM_DOORS[entryDoor];
    this.player.setPosition(door?.entryX ?? ROOM_CENTER.x, door?.entryY ?? ROOM_CENTER.y);
    this.player.dashRemaining = 0;
    this.player.charge = 0;
    this.roomView.light(this.elapsed, this.player);
    this.doorCooldown = this.elapsed + 235;
    if (!this.room.cleared) this.spawnRoom();
  }

  clearRoomObjects() {
    this.roomView?.destroy();
    for (const projectile of this.projectiles) projectile.destroy();
    for (const enemy of this.enemies) enemy.destroy();
    for (const effect of this.resetEffects) {
      this.tweens.killTweensOf(effect);
      effect.destroy();
    }
    this.resetEffects.clear();
    this.projectiles = [];
    this.enemies = [];
    this.actions = [];
    this.boss = null;
  }

  spawnRoom() {
    const element = this.floor.element;
    const difficulty = 1 + 0.15 * this.floorIndex;
    if (this.room.kind === 'boss') {
      const signs = HYBRID_BOSS_SIGNS[element] ?? ZODIAC_SIGNS.filter((sign) => sign.element === element).map((sign) => sign.id);
      const signId = signs[Math.floor(this.random() * signs.length)];
      this.boss = new Boss(this, { ...ROOM_CENTER, element, difficulty, signId });
      this.enemies.push(this.boss);
      return;
    }

    // Muestrea posiciones alejadas de la puerta de llegada y prioriza que
    // ninguna aparición coincida con un bloque de piedra.
    const positions = spawnOffsets.map(([x, y]) => ({ x: ROOM_CENTER.x + x, y: ROOM_CENTER.y + y }))
      .filter(({ x, y }) => !this.blocked(x, y, 9) && Math.hypot(x - this.player.x, y - this.player.y) >= 43);
    const count = Math.min(5, 2 + this.floorIndex + Number(this.random() < 0.38));
    const firstArchetype = Math.floor(this.random() * archetypes.length);
    for (let index = 0; index < Math.min(count, positions.length); index++) {
      const position = positions.splice(Math.floor(this.random() * positions.length), 1)[0];
      const archetype = archetypes[(firstArchetype + index) % archetypes.length];
      this.enemies.push(new Enemy(this, { ...position, element, archetype, difficulty }));
    }
  }

  blocked(x, y, radius) {
    return isBlocked(this.room, x, y, radius);
  }

  addProjectile(options) {
    const projectile = new Projectile(this, options);
    this.projectiles.push(projectile);
    return projectile;
  }

  update(_time, frameDelta) {
    if (!this.player) return;
    if (this.modal) return;
    if (this.freeze > 0) {
      this.freeze -= frameDelta;
      return;
    }

    // Limitar el paso evita atravesar muros tras volver a una pestaña inactiva.
    const delta = Math.min(frameDelta, 30);
    this.elapsed += delta;
    this.player.update(delta);
    this.runActions();
    const enemyCount = this.enemies.length;
    for (let index = 0; index < enemyCount; index++) this.enemies[index].update(delta);
    const projectileCount = this.projectiles.length;
    for (let index = 0; index < projectileCount; index++) this.projectiles[index].update(delta);
    this.removeInactive();

    if (!this.player.alive) {
      this.finish('defeat');
      return;
    }
    if (!this.room.cleared && (this.boss ? !this.boss.alive : this.enemies.length === 0)) {
      this.clearEncounter();
      return;
    }
    if (this.elapsed >= (this.nextLight ?? 0)) {
      this.roomView.light(this.elapsed, this.player);
      this.nextLight = this.elapsed + 100;
    }
    if (this.room.cleared && this.elapsed >= this.doorCooldown) {
      for (const [direction, id] of Object.entries(this.room.doors)) {
        const door = ROOM_DOORS[direction];
        if (Math.hypot(door.x - this.player.x, door.y - this.player.y) < 10) {
          this.enterRoom(id, oppositeDoor(direction));
          return;
        }
      }
    }
  }

  removeInactive() {
    // Compacta sin clonar las listas cada fotograma. Se espera a terminar
    // el paso porque los golpes pueden crear nuevos proyectiles o derrotar
    // enemigos y otros hooks siguen usando esos objetos durante el paso.
    if (this.enemies.some((enemy) => !enemy.alive)) this.enemies = this.enemies.filter((enemy) => enemy.alive);
    if (this.projectiles.some((projectile) => !projectile.active)) {
      this.projectiles = this.projectiles.filter((projectile) => projectile.active);
    }
  }

  clearEncounter() {
    this.room.cleared = true;
    this.roomView.showDoors(true);
    this.actions.length = 0;
    for (const projectile of this.projectiles) projectile.destroy();
    this.projectiles.length = 0;
    for (const effect of this.resetEffects) {
      this.tweens.killTweensOf(effect);
      effect.destroy();
    }
    this.resetEffects.clear();

    if (this.boss) {
      for (const enemy of this.enemies) enemy.destroy();
      this.enemies.length = 0;
      const unlocked = unlockFloorReward(saveSystem, this.floor.element, this.boss.signId);
      this.floorsCleared++;
      const final = this.floorsCleared === this.route.length;
      this.player.heal(Math.ceil(this.player.stats.maxHealth * 0.32));
      this.modal = 'floor';
      if (final) this.record('victory');
      this.hud.floorCleared(unlocked, final, () => {
        if (final) {
          this.finishScene('zodiac');
          return;
        }
        this.hud.closeModal();
        this.modal = null;
        this.floorIndex++;
        this.beginFloor();
      });
      return;
    }

    this.player.heal(Math.ceil(this.player.stats.maxHealth * 0.07));
    const candidates = SPELL_MODIFIERS.filter((modifier) => (
      (this.player.modifiers[modifier.id] ?? 0) < MAX_MODIFIER_STACKS[modifier.id]
      && (this.player.spell.speed || this.player.spell.kind === 'summon' || !['fork', 'needle'].includes(modifier.id))
      && (modifier.id !== 'growth' || this.player.spell.radius || this.player.spell.kind === 'cone')
    ));
    if (this.rewardCount < 2 && candidates.length) {
      this.rewardCount++;
      const offer = [];
      while (offer.length < 3 && candidates.length) {
        offer.push(candidates.splice(Math.floor(this.random() * candidates.length), 1)[0]);
      }
      this.modal = 'reward';
      this.hud.offerModifiers(offer, (id) => {
        this.player.addModifier(id);
        this.hud.closeModal();
        this.modal = null;
      });
    } else {
      this.showNotice('SALA DESPEJADA', 0xcfbea7);
    }
  }

  togglePause() {
    if (this.modal === 'pause') {
      this.hud.closeModal();
      this.modal = null;
    } else if (!this.modal && this.scene.isActive('hud')) {
      this.modal = 'pause';
      this.hud.pause(() => this.togglePause(), () => {
        this.record('defeat');
        this.finishScene('menu');
      });
    }
  }

  finish(outcome) {
    this.modal = 'ending';
    this.record(outcome);
    this.hud.defeat(this.floorsCleared, () => this.finishScene('zodiac'));
  }

  record(outcome) {
    const { signId, parentSignId, aspectId, hybridId } = this.build;
    saveSystem.completeRun({ signId, parentSignId, aspectId, hybridId, outcome, floors: this.floorsCleared });
  }

  finishScene(key) {
    this.scene.stop('hud');
    this.scene.start(key);
  }

  showNotice(text, color) {
    this.hud.showNotice(text, color);
  }

  hitStop(duration) {
    this.freeze = Math.max(this.freeze, duration);
  }

  enemyDefeated(enemy) {
    if (enemy === this.boss) this.hitStop(90);
    this.spark(enemy.x, enemy.y, enemy.color);
  }

  spark(x, y, color) {
    // Fragmentos rectangulares de vida corta. El pool de efectos de sala
    // se limpia también al cruzar una puerta o terminar el encuentro.
    const particles = this.add.graphics({ x, y }).setDepth(15);
    for (let index = 0; index < 5; index++) {
      const angle = index * Math.PI * 2 / 5 + this.random() * 0.25;
      particles.fillStyle(index % 2 ? 0xfff0de : color)
        .fillRect(Math.round(Math.cos(angle) * 7), Math.round(Math.sin(angle) * 7), 2, 2);
    }
    this.fade(particles, 140, 1.45);
  }

  dashTrail(player) {
    const ghost = this.add.image(player.x, player.y, 'player', 0).setScale(1.5).setAlpha(0.43).setDepth(9);
    if (this.canTint) ghost.setTint(player.color);
    this.fade(ghost, 135, 1.3);
  }

  fade(object, duration, scale) {
    this.resetEffects.add(object);
    this.tweens.add({
      targets: object, alpha: 0, scale, duration,
      onComplete: () => {
        this.resetEffects.delete(object);
        object.destroy();
      },
    });
  }

  after(delay, callback) {
    this.actions.push({ time: this.elapsed + delay, callback });
  }

  runActions() {
    // Los avisos siguen el tiempo del combate y se congelan en pausa.
    // Se retiran antes de ejecutar para permitir que un patrón añada otros.
    const pending = this.actions;
    this.actions = [];
    for (const action of pending) {
      if (action.time <= this.elapsed) action.callback();
      else this.actions.push(action);
    }
  }

  telegraph(x, y, radius, color, delay, action) {
    const marker = this.add.graphics().setDepth(5);
    marker.fillStyle(color, 0.16).fillCircle(x, y, radius);
    marker.lineStyle(1, color, 0.85).strokeCircle(x, y, radius);
    this.resetEffects.add(marker);
    this.after(delay, () => {
      this.resetEffects.delete(marker);
      marker.destroy();
      action();
    });
  }

  summon(boss) {
    const positions = spawnOffsets.map(([x, y]) => ({ x: ROOM_CENTER.x + x, y: ROOM_CENTER.y + y }));
    const position = positions.find(({ x, y }) => !this.blocked(x, y, 8)
      && this.enemies.every((enemy) => !enemy.alive || Math.hypot(enemy.x - x, enemy.y - y) > 28)
      && Math.hypot(this.player.x - x, this.player.y - y) > 36);
    if (position) this.enemies.push(new Enemy(this, { ...position, element: boss.element, archetype: 'melee', summoned: true }));
  }

  chainDamage(source, damage, count, color) {
    const targets = this.enemies.filter((enemy) => enemy !== source && enemy.alive && Math.hypot(enemy.x - source.x, enemy.y - source.y) < 85);
    for (const target of targets.slice(0, count)) {
      const arc = this.add.graphics().setDepth(14);
      arc.lineStyle(1, color, 0.9).lineBetween(source.x, source.y, target.x, target.y);
      this.fade(arc, 105, 1);
      target.takeDamage(damage);
    }
  }
}
