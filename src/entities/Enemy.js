import { ENEMY_ARCHETYPES, ENEMY_ELEMENTS } from '../data/enemiesData.js';
import { primaryElement } from '../data/elementalPowers.js';
import { affinityColor } from '../systems/GeneticSystem.js';

export class Enemy {
  constructor(scene, { x, y, element, archetype, difficulty = 1, summoned = false }) {
    const base = ENEMY_ARCHETYPES[archetype];
    const affinity = ENEMY_ELEMENTS[element] ?? ENEMY_ELEMENTS[primaryElement(element)];
    this.scene = scene;
    this.element = element;
    this.archetype = archetype;
    this.biome = primaryElement(element);
    this.pattern = affinity.pattern;
    this.frameRow = affinity.frameRow;
    this.color = affinityColor(element);
    this.maxHealth = Math.round(base.health * affinity.health * difficulty);
    this.health = this.maxHealth;
    this.speed = base.speed * affinity.speed;
    this.damage = base.damage + Math.round((difficulty - 1) * 6);
    this.reach = base.reach;
    this.interval = base.interval;
    this.attackTimer = 480 + scene.random() * 620;
    this.radius = 7;
    this.alive = true;
    this.summoned = summoned;
    this.artFrame = (this.frameRow * 3 + base.frame) * 8;
    this.animationTime = scene.random() * 400;
    this.poseRemaining = 0;
    this.sprite = scene.add.image(x, y, 'enemies', this.artFrame).setScale(0.73).setDepth(11);
    this.shadow = scene.add.ellipse(x, y + 8, 15, 5, 0x080911, 0.66).setDepth(3);
    this.healthBar = scene.add.graphics().setDepth(13);
    this.badge = scene.add.graphics().setDepth(12);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(delta) {
    if (!this.updateStatus(delta)) return;
    const player = this.scene.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);
    if (!this.poseRemaining) {
      if (distance > this.reach * 0.85) this.move(angle, delta, this.biome === 'fire' ? 1.14 : 1);
      else if (distance < this.reach * 0.52 && this.archetype === 'ranged') this.move(angle + Math.PI, delta, 0.66);
      else if (this.biome === 'air') this.move(angle + Math.PI * 0.48, delta, 0.72);
    }
    if (distance < this.reach + 7 && this.attackTimer <= 0) {
      this.attackTimer = this.interval * (this.biome === 'fire' ? 0.8 : 0.93);
      this.attack(angle);
    }
    this.animate(delta);
    this.drawHealth();
  }

  updateStatus(delta) {
    if (!this.alive) return false;
    this.attackTimer -= delta;
    this.poseRemaining = Math.max(0, this.poseRemaining - delta);
    this.rootRemaining = Math.max(0, (this.rootRemaining ?? 0) - delta);
    if (this.poisonTicks) {
      this.poisonTimer -= delta;
      if (this.poisonTimer <= 0) {
        this.poisonTicks--;
        this.poisonTimer += 600;
        this.takeDamage(this.poisonDamage);
        if (!this.alive) return false;
      }
    }
    this.slowRemaining = Math.max(0, (this.slowRemaining ?? 0) - delta);
    this.wardRemaining = Math.max(0, (this.wardRemaining ?? 0) - delta);
    this.flash = Math.max(0, (this.flash ?? 0) - delta);

    if (this.burnTicks) {
      this.burnTimer -= delta;
      if (this.burnTimer <= 0) {
        this.burnTicks--;
        this.burnTimer += 500;
        this.takeDamage(this.burnDamage);
      }
    }
    return this.alive;
  }

  move(angle, delta, speedMultiplier = 1) {
    // Intenta rodear paredes y otros enemigos con dos direcciones vecinas
    // si la trayectoria deseada está obstruida.
    if (this.rootRemaining > 0) return;
    const speed = this.speed * speedMultiplier * (this.slowRemaining ? this.slowMultiplier : 1);
    const distance = speed * delta / 1000;
    const startX = this.x;
    const startY = this.y;
    for (const offset of [0, 0.9, -0.9, 1.65, -1.65]) {
      const x = startX + Math.cos(angle + offset) * distance;
      const y = startY + Math.sin(angle + offset) * distance;
      if (this.scene.blocked(x, y, this.radius)) continue;
      if (this.scene.enemies.some((other) => other !== this && other.alive
        && Math.hypot(other.x - x, other.y - y) < (other.radius + this.radius) * 0.72
        && Math.hypot(other.x - x, other.y - y) < Math.hypot(other.x - startX, other.y - startY))) continue;
      this.sprite.setPosition(x, y).setFlipX(x < startX);
      return;
    }
  }

  playPose(duration) {
    this.poseRemaining = duration;
    this.poseDuration = duration;
  }

  animate(delta) {
    this.animationTime += delta;
    const moving = this.lastX !== undefined && Math.hypot(this.x - this.lastX, this.y - this.lastY) > 0.05;
    this.lastX = this.x;
    this.lastY = this.y;
    const phase = Math.floor(this.animationTime / (moving ? 88 : 175));
    const pose = this.flash > 0 ? 7
      : this.poseRemaining ? 4 + Math.min(2, Math.floor(3 * (1 - this.poseRemaining / this.poseDuration)))
        : phase % 4;
    this.sprite.setFrame(this.artFrame + pose);
    if (this.scene.canTint) {
      if (this.flash > 0) this.sprite.setTintFill(0xffe8bc);
      else this.sprite.clearTint();
    }
    this.shadow.setPosition(this.x, this.y + 8);
  }

  attack(angle) {
    this.playPose(this.biome === 'earth' ? 360 : 235);
    this.sprite.setFlipX(Math.cos(angle) < 0);
    if (this.archetype === 'melee') {
      const reach = this.biome === 'fire' ? 28 : 16;
      const radius = this.biome === 'earth' ? 21 : 15;
      const x = this.x + Math.cos(angle) * reach;
      const y = this.y + Math.sin(angle) * reach;
      if (this.biome === 'earth') this.wardRemaining = 360;
      this.scene.telegraph(x, y, radius, this.color, this.biome === 'earth' ? 385 : 235, () => {
        if (this.alive && this.biome === 'fire') this.move(angle, 85, 2.4);
        this.area(x, y, radius, this.biome === 'water' ? 640 : 150);
      });
    } else if (this.archetype === 'ranged') {
      this.scene.aimWarning(this.x, this.y, angle, 165, () => {
        if (this.biome === 'water') this.shot(angle, 147, 1);
        else if (this.biome === 'air') this.fan(angle, 2, 0.27, 192);
        else this.shoot(angle, 182);
      });
    } else {
      this.elementalAttack(angle);
    }
  }

  elementalAttack(angle) {
    const { x, y } = this.scene.player;
    switch (this.pattern) {
      case 'fan': this.fan(angle, 3, 0.62, 151); break;
      case 'ward':
        this.wardRemaining = 900;
        this.scene.telegraph(this.x, this.y, 40, this.color, 470, () => this.area(this.x, this.y, 40, 160));
        break;
      case 'spiral': this.radial(angle, 6, 131); break;
      case 'pool': this.scene.telegraph(x, y, 24, this.color, 445, () => this.area(x, y, 24, 820)); break;
      case 'magma': this.scene.telegraph(x, y, 28, this.color, 390, () => this.area(x, y, 28, 1030)); break;
      case 'storm':
        this.fan(angle, 2, 0.49, 190);
        this.scene.telegraph(x, y, 19, this.color, 380, () => this.area(x, y, 19, 200));
        break;
    }
  }

  fan(angle, count, spread, speed) {
    for (let index = 0; index < count; index++) {
      const offset = count === 1 ? 0 : (index / (count - 1) - 0.5) * spread;
      this.shoot(angle + offset, speed);
    }
  }

  radial(angle, count, speed) {
    for (let index = 0; index < count; index++) this.shoot(angle + Math.PI * 2 * index / count, speed);
  }

  shoot(angle, speed) { this.shot(angle, speed, 0); }

  shot(angle, speed, bounces) {
    if (!this.alive) return;
    this.scene.addProjectile({
      x: this.x + Math.cos(angle) * (this.radius + 2), y: this.y + Math.sin(angle) * (this.radius + 2),
      owner: this, hostile: true, angle, speed, bounces, lifetime: 2800, damage: this.damage,
      color: this.color, frame: this.frameRow * 4 + (this.archetype === 'ranged' ? 0 : 1),
    });
  }

  area(x, y, radius, lifetime, damage = this.damage) {
    if (!this.alive) return;
    this.scene.addProjectile({
      x, y, owner: this, hostile: true, kind: 'pool', color: this.color,
      frame: this.frameRow * 4 + (this.archetype === 'ranged' ? 0 : 1), radius, lifetime, damage, hitInterval: 500,
    });
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount * (this.wardRemaining ? 0.52 : 1));
    this.flash = 100;
    if (this.health === 0) {
      this.destroy();
      this.scene.enemyDefeated(this);
    }
    return true;
  }

  applyBurn(damage) {
    this.burnDamage = Math.max(this.burnTicks ? this.burnDamage : 0, damage);
    if (!this.burnTicks) this.burnTimer = 500;
    this.burnTicks = 4;
  }

  applyPoison(damage) {
    this.poisonDamage = Math.max(this.poisonTicks ? this.poisonDamage : 0, damage);
    if (!this.poisonTicks) this.poisonTimer = 600;
    this.poisonTicks = 5;
  }

  pullToward(owner, distance) {
    const angle = Math.atan2(owner.y - this.y, owner.x - this.x);
    const strength = Math.min(distance, Math.max(0, Math.hypot(owner.x - this.x, owner.y - this.y) - 18));
    const x = this.x + Math.cos(angle) * strength;
    const y = this.y + Math.sin(angle) * strength;
    if (!this.scene.blocked(x, y, this.radius)) this.sprite.setPosition(x, y);
  }

  applySlow(multiplier) {
    this.slowMultiplier = Math.min(this.slowRemaining ? this.slowMultiplier : 1, multiplier);
    this.slowRemaining = 1200;
  }

  drawHealth() {
    const width = this.radius * 2 + 6;
    const x = this.x - width / 2;
    const y = this.y - this.radius - 8;
    this.badge.clear();
    this.badge.fillStyle(this.color, 0.96);
    this.badge.fillRect(this.x - 2, y - 3, 4, 2);
    this.healthBar.clear();
    if (this.health === this.maxHealth) return;
    this.healthBar.fillStyle(0x100d17).fillRect(x, y, width, 3);
    this.healthBar.fillStyle(this.color).fillRect(x, y, width * this.health / this.maxHealth, 2);
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
    this.healthBar.destroy();
    this.badge.destroy();
    this.shadow.destroy();
  }
}
