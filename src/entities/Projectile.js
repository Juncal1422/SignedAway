import { MODIFIER_BY_ID } from '../data/spellModifiers.js';

// Un proyectil es también un volumen persistente o instantáneo. Solo los
// proyectiles móviles comprueban bloqueo contra muros. Los daños periódicos
// conservan un reloj por objetivo para evitar el daño por fotograma.
export class Projectile {
  constructor(scene, options) {
    this.scene = scene;
    this.hostile = Boolean(options.hostile);
    this.secondary = Boolean(options.secondary);
    this.owner = options.owner;
    this.kind = options.kind ?? 'bolt';
    this.angleRadians = options.angle ?? 0;
    this.speed = options.speed ?? 0;
    this.damage = options.damage;
    this.baseDamage = options.damage;
    this.affinity = this.hostile ? {} : (this.owner?.build?.affinity ?? {});
    this.damage *= this.affinity.damageScale ?? 1;
    this.lifetime = options.lifetime ?? 320;
    this.remainingPierce = options.pierce ?? 0;
    this.basePierce = this.remainingPierce;
    this.remainingPierce += this.affinity.pierce ?? 0;
    this.bounces = options.bounces ?? 0;
    this.radius = options.radius ?? 0;
    this.currentRadius = this.radius;
    this.hitInterval = options.hitInterval ?? Infinity;
    this.spreadRadians = options.spreadRadians ?? Math.PI * 2;
    this.color = options.color;
    this.frame = options.frame ?? 0;
    this.hitTimes = new Map();
    this.age = 0;
    this.active = true;
    this.returning = false;
    this.isMobile = this.speed > 0;
    this.modifiers = Object.entries(options.modifiers ?? {}).map(([id, stacks]) => [MODIFIER_BY_ID[id], stacks]);
    this.sprite = scene.add.image(options.x, options.y, 'projectiles', this.frame * 4)
      .setDepth(this.hostile ? 8 : 10)
      .setScale(this.hostile ? 0.57 : 0.70);
    this.sprite.setRotation(this.angleRadians);
    if (scene.canTint && this.hostile) this.sprite.setTint(0xffb0ac);
    this.wake = this.isMobile ? scene.add.graphics().setDepth(7) : null;
    this.glow = scene.add.image(options.x, options.y, 'element-glow')
      .setDepth(3).setBlendMode(1).setAlpha(this.hostile ? 0.28 : 0.58);
    if (scene.canTint) this.glow.setTint(this.color);
    if (this.radius > 0) {
      this.zone = scene.add.graphics().setDepth(4);
      if (['pool', 'area', 'cone', 'shield'].includes(this.kind)) this.sprite.setVisible(false);
    }
    for (const [modifier, stacks] of this.modifiers) modifier.onSpawn?.(this, stacks);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  drawWake(pose) {
    this.wake.clear();
    const x = this.x;
    const y = this.y;
    const vx = Math.cos(this.angleRadians);
    const vy = Math.sin(this.angleRadians);
    const length = Math.min(this.age * this.speed / 1000, this.hostile ? 9 : 17);
    const color = this.hostile ? 0xff6576 : this.color;
    this.wake.lineStyle(1, color, 0.58).lineBetween(x - vx * 4, y - vy * 4, x - vx * length, y - vy * length);
    if (this.hostile) {
      this.wake.lineStyle(0.8, color, 0.95).strokeCircle(x, y, 5);
    } else if (length > 11) {
      const offset = pose % 2 ? 2 : -2;
      this.wake.fillStyle(color, 0.6).fillRect(x - vx * length - vy * offset, y - vy * length + vx * offset, 1.5, 1.5);
    }
  }

  spawnSecondary(angle, damageScale) {
    // Los secundarios heredan efectos de impacto y actualización. El hook
    // Bifurcación consulta secondary antes de intentar crear más proyectiles.
    this.scene.addProjectile({
      owner: this.owner, x: this.x, y: this.y, kind: this.kind, secondary: true,
      angle, damage: this.baseDamage * damageScale, speed: this.speed,
      lifetime: this.lifetime, radius: this.radius, pierce: this.basePierce,
      bounces: this.bounces, color: this.color, frame: this.frame,
      modifiers: this.owner.modifiers,
    });
  }

  update(delta) {
    this.age += delta;
    if (this.age >= this.lifetime) {
      this.destroy();
      return;
    }
    for (const [modifier, stacks] of this.modifiers) modifier.onUpdate?.(this, stacks);
    if (this.isMobile) this.move(delta);
    if (!this.active) return;
    if (this.kind === 'orbit') {
      const angle = this.angleRadians + this.age * 0.009;
      this.sprite.setPosition(this.owner.x + Math.cos(angle) * 27, this.owner.y + Math.sin(angle) * 27);
    } else if (this.kind === 'shield' || this.kind === 'cone') {
      this.sprite.setPosition(this.owner.x, this.owner.y);
    }
    this.glow.setPosition(this.x, this.y);

    const pose = Math.floor(this.age / 47) % 4;
    this.sprite.setFrame(this.frame * 4 + pose);
    if (this.kind === 'orbit') this.sprite.setRotation(this.age * 0.009);
    if (this.wake) this.drawWake(pose);
    if (this.zone) this.drawZone();
    if (this.kind === 'summon') {
      // Un guardián busca y dispara en intervalos independientes de su vida.
      if (this.age >= (this.nextShot ?? 0)) {
        this.nextShot = this.age + 330;
        this.fireSummon();
      }
      return;
    }

    const targets = this.hostile ? [this.scene.player] : this.scene.enemies;
    for (const target of targets) {
      if (!this.active || !target.alive) continue;
      if (!this.canHit(target)) continue;
      const bonus = this.affinity.chaos && this.scene.random() < this.affinity.chaos ? 1.5 : 1;
      if (!target.takeDamage(this.damage * bonus)) continue;
      this.hitTimes.set(target, this.age);
      this.scene.spark(target.x, target.y, this.color);
      if (this.affinity.burn) target.applyBurn(this.damage * this.affinity.burn);
      if (target.alive && this.affinity.poison) target.applyPoison(this.damage * this.affinity.poison);
      if (target.alive && this.affinity.pull) target.pullToward(this.owner, this.affinity.pull);
      if (this.affinity.slow) target.applySlow(this.affinity.slow);
      if (this.affinity.chain) this.scene.chainDamage(target, this.damage * this.affinity.chain, 1, this.color);
      for (const [modifier, stacks] of this.modifiers) modifier.onHit?.(this, target, stacks);
      if (this.kind === 'trap') {
        this.scene.addProjectile({
          x: this.x, y: this.y, kind: 'area', damage: this.baseDamage * 0.65,
          lifetime: 180, radius: this.currentRadius * 1.12, color: this.color, frame: this.frame,
          owner: this.owner, secondary: true,
        });
        this.destroy();
      } else if (this.isMobile && this.remainingPierce-- <= 0 && this.kind !== 'returning') {
        this.destroy();
      }
    }
  }

  move(delta) {
    if (this.kind === 'returning' && this.age > this.lifetime * 0.48) {
      if (!this.returning) this.hitTimes.clear();
      this.returning = true;
      this.angleRadians = Math.atan2(this.owner.y - this.y, this.owner.x - this.x);
      if (Math.hypot(this.owner.x - this.x, this.owner.y - this.y) < 10) {
        this.destroy();
        return;
      }
    }
    const distance = this.speed * delta / 1000;
    const x = this.x + Math.cos(this.angleRadians) * distance;
    const y = this.y + Math.sin(this.angleRadians) * distance;
    if (this.scene.blocked(x, y, 2)) {
      if (this.kind === 'returning' && !this.returning) {
        this.age = this.lifetime * 0.49;
        return;
      }
      if (this.bounces-- <= 0) {
        this.destroy();
        return;
      }
      const hitX = this.scene.blocked(x, this.y, 2);
      const hitY = this.scene.blocked(this.x, y, 2);
      if (hitX || !hitY) this.angleRadians = Math.PI - this.angleRadians;
      if (hitY || !hitX) this.angleRadians = -this.angleRadians;
    } else {
      this.sprite.setPosition(x, y);
    }
    this.sprite.setRotation(this.angleRadians);
  }

  canHit(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    if (Math.hypot(dx, dy) > (this.currentRadius || 5) + target.radius) return false;
    if (this.kind === 'cone') {
      const difference = Math.atan2(Math.sin(Math.atan2(dy, dx) - this.angleRadians), Math.cos(Math.atan2(dy, dx) - this.angleRadians));
      if (Math.abs(difference) > this.spreadRadians / 2) return false;
    }
    return !this.hitTimes.has(target) || this.age - this.hitTimes.get(target) >= this.hitInterval;
  }

  drawZone() {
    this.zone.clear();
    const radius = this.currentRadius;
    if (this.hostile) {
      this.zone.fillStyle(0xe14d62, 0.30).fillCircle(this.x, this.y, radius);
      this.zone.lineStyle(2, 0xff6678, 0.95).strokeCircle(this.x, this.y, radius);
      this.zone.lineStyle(1, 0xfde2ba, 0.44);
      for (let step = -Math.floor(radius / 7); step <= Math.floor(radius / 7); step++) {
        const offset = step * 7;
        const extent = Math.sqrt(radius ** 2 - offset ** 2) * 0.84;
        const diagonal = Math.SQRT1_2;
        this.zone.lineBetween(this.x + (offset - extent) * diagonal, this.y + (offset + extent) * diagonal,
          this.x + (offset + extent) * diagonal, this.y + (offset - extent) * diagonal);
      }
    } else if (this.kind === 'cone') {
      this.zone.fillStyle(this.color, 0.16);
      this.zone.slice(this.x, this.y, radius, this.angleRadians - this.spreadRadians / 2, this.angleRadians + this.spreadRadians / 2);
      this.zone.fillPath();
    } else if (this.kind !== 'orbit') {
      this.zone.fillStyle(this.color, 0.13).fillCircle(this.x, this.y, radius);
      this.zone.lineStyle(1, this.color, 0.55).strokeCircle(this.x, this.y, radius);
    }
  }

  fireSummon() {
    const enemy = this.scene.enemies.find((target) => target.alive && Math.hypot(target.x - this.x, target.y - this.y) < 140);
    if (!enemy) return;
    this.scene.addProjectile({
      x: this.x, y: this.y, owner: this.owner,
      angle: Math.atan2(enemy.y - this.y, enemy.x - this.x), damage: this.baseDamage,
      speed: 250, lifetime: 620, color: this.color, frame: this.frame,
      modifiers: this.owner.modifiers,
    });
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.sprite.destroy();
    this.glow.destroy();
    this.zone?.destroy();
    this.wake?.destroy();
  }
}
