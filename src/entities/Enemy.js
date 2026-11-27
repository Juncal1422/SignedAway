import { ENEMY_ARCHETYPES, ENEMY_ELEMENTS } from '../data/enemiesData.js';
import { affinityColor } from '../systems/GeneticSystem.js';

export class Enemy {
  constructor(scene, { x, y, element, archetype, difficulty = 1, summoned = false }) {
    const base = ENEMY_ARCHETYPES[archetype];
    const affinity = ENEMY_ELEMENTS[element];
    this.scene = scene;
    this.element = element;
    this.archetype = archetype;
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
    this.sprite = scene.add.image(x, y, 'enemies', this.frameRow * 3 + base.frame).setScale(1.5).setDepth(11);
    this.healthBar = scene.add.graphics().setDepth(13);
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
    if (distance > this.reach * 0.85) this.move(angle, delta);
    if (distance < this.reach * 0.48 && this.archetype === 'ranged') this.move(angle + Math.PI, delta, 0.6);
    if (distance < this.reach + 5 && this.attackTimer <= 0) {
      this.attackTimer = this.interval;
      this.attack(angle);
    }
    this.drawHealth();
  }

  updateStatus(delta) {
    if (!this.alive) return false;
    this.attackTimer -= delta;
    this.slowRemaining = Math.max(0, (this.slowRemaining ?? 0) - delta);
    this.wardRemaining = Math.max(0, (this.wardRemaining ?? 0) - delta);
    this.flash = Math.max(0, (this.flash ?? 0) - delta);
    this.sprite.setAlpha(this.flash ? 0.5 : 1);
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

  attack(angle) {
    if (this.archetype === 'melee') {
      const x = this.x + Math.cos(angle) * 14;
      const y = this.y + Math.sin(angle) * 14;
      this.scene.telegraph(x, y, 16, this.color, 230, () => this.area(x, y, 16, 140));
    } else if (this.archetype === 'ranged') {
      this.fan(angle, 1, 0, 174);
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

  shoot(angle, speed) {
    if (!this.alive) return;
    this.scene.addProjectile({
      x: this.x + Math.cos(angle) * (this.radius + 2), y: this.y + Math.sin(angle) * (this.radius + 2),
      owner: this, hostile: true, angle, speed, lifetime: 2800, damage: this.damage,
      color: this.color, frame: this.frameRow * 4 + 1,
    });
  }

  area(x, y, radius, lifetime, damage = this.damage) {
    if (!this.alive) return;
    this.scene.addProjectile({
      x, y, owner: this, hostile: true, kind: 'pool', color: this.color,
      frame: this.frameRow * 4 + 1, radius, lifetime, damage, hitInterval: 500,
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

  applySlow(multiplier) {
    this.slowMultiplier = Math.min(this.slowRemaining ? this.slowMultiplier : 1, multiplier);
    this.slowRemaining = 1200;
  }

  drawHealth() {
    const width = this.radius * 2 + 6;
    const x = this.x - width / 2;
    const y = this.y - this.radius - 8;
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
  }
}
