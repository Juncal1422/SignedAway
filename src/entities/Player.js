import Phaser from 'phaser';
import { ZODIAC_SIGNS } from '../data/zodiacData.js';
import { ROOM_BOTTOM, ROOM_LEFT, ROOM_RIGHT, ROOM_TOP, terrainAt } from '../systems/MapGenerator.js';
import { affinityColor } from '../systems/GeneticSystem.js';

const dashDuration = 144;
const dashSpeed = 345;
const movementKeys = { up: 'W', down: 'S', left: 'A', right: 'D', fire: 'J', dash: 'SPACE' };

export class Player {
  constructor(scene, build, x, y) {
    this.scene = scene;
    this.build = build;
    this.stats = build.stats;
    this.spell = build.spell;
    this.health = build.stats.maxHealth;
    this.radius = 6;
    this.color = affinityColor(build.element);
    this.attackFrame = 16 + ZODIAC_SIGNS.findIndex((sign) => sign.id === build.basicSignId);
    this.idleFrame = 32 * ZODIAC_SIGNS.findIndex((sign) => sign.id === build.signId);
    this.modifiers = {};
    this.alive = true;
    this.dashCooldown = 0;
    this.dashRemaining = 0;
    this.invulnerable = 0;
    this.castCooldown = 0;
    this.charge = 0;
    this.aimAngle = 0;
    this.trailTimer = 0;
    this.sprite = scene.add.sprite(x, y, 'player', this.idleFrame).setScale(0.74).setDepth(12);
    this.shadow = scene.add.ellipse(x, y + 8, 15, 5, 0x090911, 0.72).setDepth(3);
    this.playerTint = build.powers.length ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0xffffff), Phaser.Display.Color.IntegerToColor(this.color), 100, 48,
    ) : null;
    this.velocity = new Phaser.Math.Vector2();
    this.pointerWorld = new Phaser.Math.Vector2();
    this.keys = scene.input.keyboard.addKeys(movementKeys, true);
    this.arrows = scene.input.keyboard.createCursorKeys();
    // Un toque puede comenzar y terminar entre dos frames. Los eventos
    // guardan la acción hasta el siguiente paso de simulación.
    this.keys.dash.on('down', () => { if (!scene.modal) this.dashRequested = true; });
    this.keys.fire.on('down', () => { if (!scene.modal) this.castRequested = true; });
    scene.input.on('pointerdown', (pointer) => {
      if (!scene.modal && this.pointerInRoom(pointer)) this.pointerCastRequested = true;
    });
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this.shadow.setPosition(x, y + 8);
    this.velocity.reset();
  }

  update(delta) {
    this.actionTimer = Math.max(0, (this.actionTimer ?? 0) - delta);
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    this.dashRemaining = Math.max(0, this.dashRemaining - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.castCooldown = Math.max(0, this.castCooldown - delta);
    this.shieldRemaining = Math.max(0, (this.shieldRemaining ?? 0) - delta);
    const horizontal = Number(this.keys.right.isDown || this.arrows.right.isDown) - Number(this.keys.left.isDown || this.arrows.left.isDown);
    const vertical = Number(this.keys.down.isDown || this.arrows.down.isDown) - Number(this.keys.up.isDown || this.arrows.up.isDown);
    const moving = Boolean(horizontal || vertical);
    const moveAngle = moving ? Math.atan2(vertical, horizontal) : this.aimAngle;
    const pointer = this.scene.input.activePointer;
    const heldMouse = pointer.leftButtonDown() && this.pointerInRoom(pointer);
    const mouseCasting = heldMouse || this.pointerCastRequested;
    const casting = this.spell.chargeTime
      ? heldMouse || this.keys.fire.isDown
      : mouseCasting || this.keys.fire.isDown || this.castRequested;
    this.pointerCastRequested = false;
    this.castRequested = false;
    if (mouseCasting) {
      this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y, this.pointerWorld);
      this.aimAngle = Math.atan2(this.pointerWorld.y - this.y, this.pointerWorld.x - this.x);
    } else if (moving) {
      this.aimAngle = moveAngle;
    }

    const dashRequested = this.dashRequested;
    this.dashRequested = false;
    if (dashRequested && this.dashCooldown === 0) {
      this.dashRemaining = dashDuration;
      this.playAction('dash', dashDuration);
      this.dashCooldown = this.stats.dashCooldown;
      this.invulnerable = Math.max(this.invulnerable, dashDuration + 22);
      this.dashAngle = moving ? moveAngle : this.aimAngle;
      this.trailTimer = 0;
    }
    if (this.dashRemaining > 0) {
      this.move(this.dashAngle, dashSpeed * delta / 1000);
      this.trailTimer -= delta;
      if (this.trailTimer <= 0) {
        this.scene.dashTrail(this);
        this.trailTimer = 24;
      }
    } else {
      const shallowWater = !this.scene.room.cleared && this.scene.floor.biome === 'water'
        && terrainAt(this.scene.room, this.x, this.y);
      const speed = moving ? this.stats.moveSpeed * (shallowWater ? 0.65 : 1) : 0;
      const response = 1 - Math.exp(-delta / (moving ? 43 : 35));
      this.velocity.x += (Math.cos(moveAngle) * speed - this.velocity.x) * response;
      this.velocity.y += (Math.sin(moveAngle) * speed - this.velocity.y) * response;
      if (this.velocity.lengthSq() > 6) this.move(this.velocity.angle(), this.velocity.length() * delta / 1000);
    }
    this.sprite.setFlipX(Math.cos(this.dashRemaining ? this.dashAngle : this.aimAngle) < 0);
    if (!this.actionTimer) this.sprite.play(`${this.build.signId}-${moving ? 'walk' : 'idle'}`, true);
    this.shadow.setPosition(this.x, this.y + 8);
    if (this.scene.canTint) {
      if (this.actionPose === 'hurt' && this.actionTimer > 155) this.sprite.setTintFill(0xffc3af);
      else if (this.playerTint) this.sprite.setTint(Phaser.Display.Color.GetColor(this.playerTint.r, this.playerTint.g, this.playerTint.b));
      else this.sprite.clearTint();
    }
    if (this.invulnerable && !this.dashRemaining && !this.actionTimer) {
      this.sprite.setAlpha(Math.floor(this.invulnerable / 58) % 2 ? 0.68 : 1);
    } else this.sprite.setAlpha(1);
    if (casting && this.castCooldown === 0) {
      if (!this.spell.chargeTime || (this.charge += delta) >= this.spell.chargeTime) {
        this.cast();
        this.charge = 0;
      }
    } else if (!casting) {
      this.charge = 0;
    }
  }

  pointerInRoom(pointer) {
    const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y, this.pointerWorld);
    return point.x >= ROOM_LEFT && point.x <= ROOM_RIGHT && point.y >= ROOM_TOP && point.y <= ROOM_BOTTOM;
  }

  move(angle, distance) {
    const x = this.x + Math.cos(angle) * distance;
    const y = this.y + Math.sin(angle) * distance;
    if (!this.scene.blocked(x, this.y, this.radius)) this.sprite.x = x;
    if (!this.scene.blocked(this.x, y, this.radius)) this.sprite.y = y;
  }

  playAction(pose, duration) {
    this.actionTimer = duration;
    this.actionPose = pose;
    this.sprite.play(`${this.build.signId}-${pose}`);
  }

  cast() {
    if (!this.dashRemaining && !(this.actionPose === 'hurt' && this.actionTimer)) this.playAction('attack', 175);
    const spell = this.spell;
    const aim = this.aimAngle;
    this.castCooldown = spell.cooldown;
    const projectile = {
      owner: this, x: this.x + Math.cos(aim) * 9, y: this.y + Math.sin(aim) * 9,
      angle: aim, speed: spell.speed, lifetime: spell.speed ? 1000 * spell.range / spell.speed : 240,
      damage: spell.damage, color: this.color, frame: this.attackFrame,
      modifiers: this.modifiers,
    };

    if (spell.kind === 'split') {
      const spread = Phaser.Math.DegToRad(spell.spreadDegrees);
      for (let index = 0; index < spell.count; index++) {
        const offset = spread * (index / (spell.count - 1) - 0.5);
        this.scene.addProjectile({ ...projectile, angle: aim + offset, frame: this.attackFrame });
      }
    } else if (spell.kind === 'pulse' || spell.kind === 'shield' || spell.kind === 'cone') {
      if (spell.kind === 'shield') this.shieldRemaining = spell.duration;
      this.scene.addProjectile({
        ...projectile, x: this.x, y: this.y, lifetime: spell.duration ?? 230,
        radius: spell.radius ?? spell.range,
        kind: { pulse: 'area', shield: 'shield', cone: 'cone' }[spell.kind],
        spreadRadians: Phaser.Math.DegToRad(spell.spreadDegrees ?? 360),
      });
    } else if (spell.kind === 'summon' || spell.kind === 'trap') {
      const placementDistance = spell.kind === 'trap' ? spell.range : spell.range * 0.32;
      const x = this.x + Math.cos(aim) * placementDistance;
      const y = this.y + Math.sin(aim) * placementDistance;
      const blocked = this.scene.blocked(x, y, 6);
      this.scene.addProjectile({
        ...projectile, x: blocked ? this.x : x, y: blocked ? this.y : y, frame: this.attackFrame,
        kind: spell.kind, lifetime: spell.duration, radius: spell.radius ?? 0,
      });
    } else if (spell.kind === 'orbit') {
      for (const angle of [aim, aim + Math.PI]) {
        this.scene.addProjectile({
          ...projectile, angle, kind: 'orbit', lifetime: spell.duration,
          radius: Math.max(5, spell.radius - 27), hitInterval: 360, frame: this.attackFrame,
        });
      }
    } else {
      this.scene.addProjectile({
        ...projectile, kind: spell.kind, pierce: spell.pierce, bounces: spell.bounces,
        lifetime: projectile.lifetime * (spell.kind === 'returning' ? 2.35 : 1),
        frame: this.attackFrame,
      });
    }
  }

  takeDamage(amount) {
    if (!this.alive || this.invulnerable > 0 || this.shieldRemaining > 0) return false;
    if (this.roomShield > 0) {
      this.roomShield--;
      this.invulnerable = 260;
      return true;
    }
    const damage = amount * (1 - (this.build.affinity.armor ?? 0));
    this.health = Math.max(0, this.health - damage);
    this.invulnerable = 560;
    this.velocity.reset();
    this.playAction('hurt', 235);
    this.scene.playerHit(this, damage);
    this.alive = this.health > 0;
    return true;
  }

  heal(amount) {
    this.health = Math.min(this.stats.maxHealth, this.health + amount);
  }

}
