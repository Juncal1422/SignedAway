import Phaser from 'phaser';
import { ELEMENTS } from '../data/zodiacData.js';
import { MAX_MODIFIER_STACKS } from '../data/spellModifiers.js';
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
    this.frameRow = Object.keys(ELEMENTS).indexOf(build.elements[0]) * 4;
    this.modifiers = {};
    this.alive = true;
    this.dashCooldown = 0;
    this.dashRemaining = 0;
    this.invulnerable = 0;
    this.castCooldown = 0;
    this.charge = 0;
    this.aimAngle = 0;
    this.trailTimer = 0;
    this.sprite = scene.add.sprite(x, y, 'player', 0).setScale(1.5).setDepth(12);
    this.keys = scene.input.keyboard.addKeys(movementKeys, true);
    this.arrows = scene.input.keyboard.createCursorKeys();
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
  }

  update(delta) {
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    this.dashRemaining = Math.max(0, this.dashRemaining - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.castCooldown = Math.max(0, this.castCooldown - delta);
    this.shieldRemaining = Math.max(0, (this.shieldRemaining ?? 0) - delta);
    const horizontal = Number(this.keys.right.isDown || this.arrows.right.isDown) - Number(this.keys.left.isDown || this.arrows.left.isDown);
    const vertical = Number(this.keys.down.isDown || this.arrows.down.isDown) - Number(this.keys.up.isDown || this.arrows.up.isDown);
    const moving = Boolean(horizontal || vertical);
    const moveAngle = moving ? Math.atan2(vertical, horizontal) : this.aimAngle;
    const mouseCasting = this.scene.input.activePointer.leftButtonDown();
    const casting = mouseCasting || this.keys.fire.isDown;
    if (mouseCasting) {
      const pointer = this.scene.input.activePointer;
      this.aimAngle = Math.atan2(pointer.y - this.y, pointer.x - this.x);
    } else if (moving) {
      this.aimAngle = moveAngle;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) && this.dashCooldown === 0) {
      this.dashRemaining = dashDuration;
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
    } else if (moving) {
      this.move(moveAngle, this.stats.moveSpeed * delta / 1000);
    }
    if (moving || this.dashRemaining) {
      if (!this.sprite.anims.isPlaying) this.sprite.play('walk');
    } else {
      this.sprite.stop().setFrame(0);
    }
    this.sprite.setAlpha(this.invulnerable > 0 ? 0.56 : 1);
    if (casting && this.castCooldown === 0) {
      if (!this.spell.chargeTime || (this.charge += delta) >= this.spell.chargeTime) {
        this.cast();
        this.charge = 0;
      }
    } else if (!casting) {
      this.charge = 0;
    }
  }

  move(angle, distance) {
    const x = this.x + Math.cos(angle) * distance;
    const y = this.y + Math.sin(angle) * distance;
    if (!this.scene.blocked(x, this.y, this.radius)) this.sprite.x = x;
    if (!this.scene.blocked(this.x, y, this.radius)) this.sprite.y = y;
  }

  cast() {
    const spell = this.spell;
    const aim = this.aimAngle;
    this.castCooldown = spell.cooldown;
    const projectile = {
      owner: this, x: this.x + Math.cos(aim) * 9, y: this.y + Math.sin(aim) * 9,
      angle: aim, speed: spell.speed, lifetime: spell.speed ? 1000 * spell.range / spell.speed : 240,
      damage: spell.damage, color: this.color, frame: this.frameRow,
      modifiers: this.modifiers,
    };

    if (spell.kind === 'split') {
      const spread = Phaser.Math.DegToRad(spell.spreadDegrees);
      for (let index = 0; index < spell.count; index++) {
        const offset = spread * (index / (spell.count - 1) - 0.5);
        this.scene.addProjectile({ ...projectile, angle: aim + offset, frame: this.frameRow + 2 });
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
        ...projectile, x: blocked ? this.x : x, y: blocked ? this.y : y, frame: this.frameRow + 3,
        kind: spell.kind, lifetime: spell.duration, radius: spell.radius ?? 0,
      });
    } else if (spell.kind === 'orbit') {
      for (const angle of [aim, aim + Math.PI]) {
        this.scene.addProjectile({
          ...projectile, angle, kind: 'orbit', lifetime: spell.duration,
          radius: Math.max(5, spell.radius - 27), hitInterval: 360, frame: this.frameRow + 1,
        });
      }
    } else {
      this.scene.addProjectile({
        ...projectile, kind: spell.kind, pierce: spell.pierce, bounces: spell.bounces,
        lifetime: projectile.lifetime * (spell.kind === 'returning' ? 2.35 : 1),
        frame: this.frameRow + (spell.kind === 'returning' ? 2 : 0),
      });
    }
  }

  takeDamage(amount) {
    if (!this.alive || this.invulnerable > 0 || this.shieldRemaining > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 600;
    this.scene.hitStop(54);
    this.scene.cameras.main.shake(105, 0.008);
    this.alive = this.health > 0;
    return true;
  }

  heal(amount) {
    this.health = Math.min(this.stats.maxHealth, this.health + amount);
  }

  addModifier(id) {
    const previous = this.modifiers[id] ?? 0;
    if (previous >= MAX_MODIFIER_STACKS[id]) return false;
    this.modifiers[id] = previous + 1;
    return true;
  }
}
