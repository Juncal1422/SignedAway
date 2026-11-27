import { BOSSES } from '../data/enemiesData.js';
import { ZODIAC_SIGNS } from '../data/zodiacData.js';
import { ROOM_CENTER, ROOM_LEFT, ROOM_RIGHT, ROOM_TOP, ROOM_BOTTOM } from '../systems/MapGenerator.js';
import { Enemy } from './Enemy.js';

const styles = {
  brawler: { reach: 39, motion: 1.23 },
  anchor: { reach: 74, motion: 0.65 },
  skirmish: { reach: 88, motion: 1, orbit: 0.92 },
  keeper: { reach: 102, motion: 0.74, orbit: 0.72 },
  sniper: { reach: 145, motion: 1.08, retreat: true },
};

export class Boss extends Enemy {
  constructor(scene, { x, y, element, signId, difficulty }) {
    super(scene, { x, y, element, archetype: 'elemental', difficulty });
    const data = BOSSES[signId];
    this.signId = signId;
    this.title = data.title;
    this.patterns = data.pattern;
    this.style = styles[data.style];
    this.maxHealth = Math.round(data.health * difficulty);
    this.health = this.maxHealth;
    this.speed = data.speed;
    this.damage = data.damage + Math.round((difficulty - 1) * 10);
    this.interval = data.interval;
    this.radius = 14;
    this.phase = 1;
    this.attackIndex = 0;
    this.attackTimer = 650;
    this.artFrame = ZODIAC_SIGNS.findIndex((sign) => sign.id === signId) * 8;
    this.sprite.setTexture('bosses', this.artFrame).setScale(1.19);
    this.shadow.setDisplaySize(26, 9);
  }

  update(delta) {
    if (!this.updateStatus(delta)) return;
    const player = this.scene.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);
    if (this.chargeRemaining > 0) {
      this.chargeRemaining -= delta;
      const distance = this.speed * 6.6 * delta / 1000;
      const x = this.x + Math.cos(this.chargeAngle) * distance;
      const y = this.y + Math.sin(this.chargeAngle) * distance;
      if (this.scene.blocked(x, y, this.radius)) this.chargeRemaining = 0;
      else this.sprite.setPosition(x, y);
      if (Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius + 2) player.takeDamage(this.damage);
    } else if (!this.preparing && this.poseRemaining < 90) {
      if (distance > this.style.reach) this.move(angle, delta, this.style.motion);
      else if (this.style.retreat && distance < this.style.reach * 0.72) this.move(angle + Math.PI, delta, 0.90);
      else if (this.style.orbit) this.move(angle + this.style.orbit, delta, 0.62);
    }

    if (this.phase === 1 && this.health <= this.maxHealth * 0.46) {
      this.phase = 2;
      this.attackIndex = 0;
      this.scene.showNotice('SEGUNDA FASE', this.color);
    }
    if (this.attackTimer <= 0 && !this.preparing) {
      const order = this.phase === 1 ? [0, 1] : [2, 0, 2, 1];
      this.attackTimer = this.interval * (this.phase === 1 ? 1 : 0.79) + 220;
      this.perform(this.patterns[order[this.attackIndex++ % order.length]], angle);
    }
    this.animate(delta);
    this.drawHealth();
  }

  later(delay, action) {
    this.scene.after(delay, () => { if (this.alive) action(); });
  }

  lane(x, y, angle, length, halfWidth, delay = 490, scale = 1) {
    this.scene.laneWarning(x, y, angle, length, halfWidth, delay, this.color, () => {
      if (this.alive) this.scene.hitLane(x, y, angle, length, halfWidth, this.damage * scale, this.color);
    });
  }

  blast(x, y, radius, delay, lifetime = 190) {
    this.scene.telegraph(x, y, radius, this.color, delay, () => this.area(x, y, radius, lifetime));
  }

  charge(angle, delay = 390) {
    this.preparing = true;
    this.scene.laneWarning(this.x, this.y, angle, 158, 10, delay, this.color, () => {
      if (!this.alive) return;
      this.preparing = false;
      this.chargeRemaining = 425;
      this.chargeAngle = angle;
      this.playPose(235);
    });
  }

  reposition(x, y) {
    x = Math.max(ROOM_LEFT + 38, Math.min(ROOM_RIGHT - 38, x));
    y = Math.max(ROOM_TOP + 32, Math.min(ROOM_BOTTOM - 32, y));
    if (this.scene.blocked(x, y, this.radius)) return;
    this.scene.spark(this.x, this.y, this.color);
    this.sprite.setPosition(x, y);
    this.scene.spark(x, y, this.color);
  }

  pounce(x, y, radius, delay = 480) {
    this.preparing = true;
    this.scene.telegraph(x, y, radius, this.color, delay, () => {
      if (!this.alive) return;
      this.preparing = false;
      this.reposition(x, y);
      this.area(x, y, radius, 210);
    });
  }

  aim() {
    const player = this.scene.player;
    return Math.atan2(player.y - this.y, player.x - this.x);
  }

  perform(pattern, angle) {
    const player = this.scene.player;
    const { x, y } = player;
    const cx = ROOM_CENTER.x;
    const cy = ROOM_CENTER.y;
    const fromLeft = ROOM_LEFT + 16;
    const fromTop = ROOM_TOP + 16;
    this.playPose(300);
    switch (pattern) {
      case 'charge': this.charge(angle); break;
      case 'trench': this.lane(this.x, this.y, angle, 155, 13); break;
      case 'stampede':
        this.charge(angle, 330);
        this.later(810, () => this.charge(this.aim(), 345));
        break;
      case 'hammer':
        this.blast(this.x, this.y, 42, 410);
        this.blast(x, y, 17, 650);
        break;
      case 'barricade':
        this.wardRemaining = 850;
        this.blast(x, y, 26, 560);
        break;
      case 'quake':
        for (const offset of [-30, 30]) this.lane(fromLeft, cy + offset, 0, 354, 19, 610);
        break;
      case 'twins':
        if (this.scene.enemies.filter((enemy) => enemy.alive && enemy.summoned).length < 2) {
          this.scene.summon(this, 'ranged');
          this.scene.summon(this, 'ranged');
        } else this.fan(angle, 3, 0.46, 170);
        break;
      case 'trade': {
        const twin = this.scene.enemies.find((enemy) => enemy.summoned && enemy.alive);
        if (twin) {
          const previous = { x: this.x, y: this.y };
          this.reposition(twin.x, twin.y);
          if (!this.scene.blocked(previous.x, previous.y, twin.radius)) twin.sprite.setPosition(previous.x, previous.y);
        }
        this.fan(this.aim(), 2, 0.30, 186);
        break;
      }
      case 'pincer':
        this.lane(fromLeft, y, 0, 354, 8, 480);
        this.lane(x, fromTop, Math.PI / 2, 160, 8, 615);
        break;
      case 'tide': this.lane(fromLeft, y, 0, 354, 15, 525); break;
      case 'shell':
        this.wardRemaining = 760;
        this.blast(x, y, 28, 520, 1200);
        break;
      case 'undertow':
        this.lane(fromLeft, cy - 41, 0, 354, 35, 540);
        this.lane(fromLeft, cy + 41, 0, 354, 35, 1060);
        break;
      case 'pounce': this.pounce(x, y, 23); break;
      case 'claw':
        for (const offset of [-0.44, 0.44]) this.lane(this.x, this.y, angle + offset, 86, 8, 385);
        break;
      case 'pride':
        this.pounce(x, y, 27, 430);
        this.later(560, () => {
          for (const offset of [-25, 25]) this.lane(fromLeft, y + offset, 0, 354, 10, 360);
        });
        break;
      case 'roots':
        this.blast(x, y, 21, 455, 580);
        this.later(430, () => this.blast(player.x, player.y, 19, 440, 610));
        break;
      case 'seed': this.scene.summon(this, 'elemental'); break;
      case 'garden':
        for (const offset of [-42, 0, 42]) this.blast(x + offset, y, 20, 510 + Math.abs(offset) * 3, 1100);
        this.scene.summon(this, 'melee');
        break;
      case 'scale':
        this.lane(fromLeft, cy + (y < cy ? -40 : 40), 0, 354, 35, 620);
        break;
      case 'verdict': this.lane(this.x, this.y, angle, 360, 8, 470); break;
      case 'inversion':
        this.lane(cx - 88, fromTop, Math.PI / 2, 160, 81, 640);
        this.lane(cx + 88, fromTop, Math.PI / 2, 160, 81, 1140);
        break;
      case 'sting':
      case 'snipe':
        this.scene.aimWarning(this.x, this.y, angle, 335, () => this.shoot(angle, pattern === 'sting' ? 305 : 358));
        break;
      case 'burrow':
        this.blast(this.x, this.y, 24, 330, 1030);
        this.later(400, () => this.reposition(x + 47, y + 17));
        break;
      case 'brood':
        this.blast(x - 33, y, 25, 360, 1400);
        this.blast(x + 33, y, 25, 510, 1400);
        this.later(575, () => this.reposition(x, y - 38));
        break;
      case 'retreat':
        this.reposition(x < cx ? cx + 123 : cx - 123, y < cy ? cy + 36 : cy - 36);
        this.shot(this.aim(), 275, 0);
        break;
      case 'volley':
        for (let index = 0; index < 3; index++) this.later(index * 320, () => this.perform('snipe', this.aim()));
        break;
      case 'fault': this.lane(this.x, this.y, angle, 215, 12, 470); break;
      case 'rockfall':
        for (const offset of [-61, 0, 61]) this.blast(x + offset, y, 22, 520 + Math.abs(offset) * 2);
        break;
      case 'avalanche':
        this.wardRemaining = 850;
        for (const [index, offset] of [-58, 0, 58].entries()) this.blast(x + offset, y, 33, 470 + 220 * index, 300);
        break;
      case 'gust':
        this.lane(x, fromTop, Math.PI / 2, 160, 15, 460);
        break;
      case 'vortex':
        this.blast(cx, cy, 35, 830);
        for (let index = 1; index <= 6; index++) {
          this.later(index * 105, () => {
            if (!player.dashRemaining) player.move(Math.atan2(cy - player.y, cx - player.x), 9);
          });
        }
        break;
      case 'stormfront':
        this.lane(fromLeft, y, 0, 354, 14, 460);
        this.later(410, () => this.lane(player.x, fromTop, Math.PI / 2, 160, 16, 490));
        break;
      case 'bounce':
        for (const offset of [-0.32, 0.32]) this.shot(angle + offset, 153, 2);
        break;
      case 'shoal':
        this.blast(x, y, 22, 460, 980);
        this.later(460, () => this.blast(player.x, player.y, 22, 405, 980));
        break;
      case 'reflection':
        this.reposition(2 * cx - this.x, 2 * cy - this.y);
        for (const offset of [-0.54, 0, 0.54]) this.shot(this.aim() + offset, 162, 2);
        break;
    }
  }
}
