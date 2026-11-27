import { BOSSES } from '../data/enemiesData.js';
import { ZODIAC_SIGNS } from '../data/zodiacData.js';
import { Enemy } from './Enemy.js';

export class Boss extends Enemy {
  constructor(scene, { x, y, element, signId, difficulty }) {
    super(scene, { x, y, element, archetype: 'elemental', difficulty });
    const data = BOSSES[signId];
    this.signId = signId;
    this.title = data.title;
    this.patterns = data.pattern;
    this.maxHealth = Math.round(data.health * difficulty);
    this.health = this.maxHealth;
    this.speed = data.speed;
    this.damage = data.damage + Math.round((difficulty - 1) * 7);
    this.interval = data.interval;
    this.radius = 15;
    this.phase = 1;
    this.attackIndex = 0;
    this.attackTimer = 780;
    this.sprite.setTexture('bosses', ZODIAC_SIGNS.findIndex((sign) => sign.id === signId)).setScale(1.42);
  }

  update(delta) {
    if (!this.updateStatus(delta)) return;
    const player = this.scene.player;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    if (this.chargeRemaining > 0) {
      this.chargeRemaining -= delta;
      this.move(this.chargeAngle, delta, 5.8);
      if (Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius) player.takeDamage(this.damage);
    } else if (!this.preparing && Math.hypot(player.x - this.x, player.y - this.y) > 40) {
      this.move(angle, delta, this.phase === 2 ? 1.27 : 1);
    }
    if (this.phase === 1 && this.health <= this.maxHealth * 0.45) {
      this.phase = 2;
      this.attackIndex = 0;
      this.scene.showNotice('EL JEFE SE ENFURECE', this.color);
    }
    if (this.attackTimer <= 0) {
      const phaseOrder = this.phase === 1 ? [0, 1] : [2, 0, 1];
      const pattern = this.patterns[phaseOrder[this.attackIndex++ % phaseOrder.length]];
      this.attackTimer = this.interval * (this.phase === 1 ? 1 : 0.78);
      this.perform(pattern, angle);
    }
    this.drawHealth();
  }

  perform(pattern, angle) {
    const player = this.scene.player;
    const enraged = this.phase === 2;
    const speed = enraged ? 183 : 143;
    const atPlayer = (radius, delay, lifetime) => {
      const { x, y } = player;
      this.scene.telegraph(x, y, radius, this.color, delay, () => this.area(x, y, radius, lifetime));
    };

    switch (pattern) {
      case 'ram':
        this.preparing = true;
        this.scene.telegraph(this.x, this.y, 26, this.color, 420, () => {
          this.preparing = false;
          this.chargeRemaining = 395;
          this.chargeAngle = angle;
        });
        break;
      case 'fan': this.fan(angle, enraged ? 7 : 5, 1.42, speed); break;
      case 'eruption': {
        atPlayer(28, 530, 420);
        for (const offset of [-1, 1]) {
          const x = player.x + Math.cos(angle + offset * 1.57) * 44;
          const y = player.y + Math.sin(angle + offset * 1.57) * 44;
          this.scene.telegraph(x, y, 19, this.color, 650, () => this.area(x, y, 19, 320));
        }
        break;
      }
      case 'shockwave':
        this.scene.telegraph(this.x, this.y, 48, this.color, 480, () => {
          this.area(this.x, this.y, 48, 220);
          this.radial(angle, enraged ? 12 : 8, speed);
        });
        break;
      case 'ward':
        this.wardRemaining = 820;
        atPlayer(24, 490, 430);
        this.fan(angle, 3, 0.8, speed);
        break;
      case 'cross':
        this.radial(angle, 4, speed + 34);
        this.scene.after(245, () => this.radial(angle + 0.78, 4, speed + 20));
        break;
      case 'spiral':
        for (let step = 0; step < 3; step++) {
          this.scene.after(step * 150, () => this.radial(angle + step * 0.24, enraged ? 8 : 6, speed));
        }
        break;
      case 'mirror':
        this.fan(angle, 3, 0.44, speed + 25);
        this.scene.after(300, () => {
          const reflectedAngle = Math.atan2(player.y - this.y, player.x - this.x);
          this.fan(reflectedAngle, 4, 0.95, speed);
        });
        break;
      case 'pool': atPlayer(enraged ? 39 : 31, 545, 1200); break;
      case 'pulse':
        this.radial(angle, 10, speed);
        atPlayer(21, 520, 235);
        break;
      case 'lance':
        this.scene.telegraph(this.x, this.y, 21, this.color, 420, () => this.fan(angle, enraged ? 3 : 1, 0.21, 315));
        break;
      case 'summon':
        if (this.scene.enemies.filter((enemy) => enemy.alive && enemy.summoned).length < 2) this.scene.summon(this);
        this.fan(angle, 3, 0.75, speed);
        break;
    }
  }
}
