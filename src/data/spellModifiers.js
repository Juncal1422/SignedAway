// Los hooks reciben la entidad del proyectil. onHit después de aplicar el daño
// recibe también el enemigo alcanzado. Los efectos de terreno usan los mismos
// hooks mediante Projectile, incluidas las invocaciones, trampas y escudos.
export const SPELL_MODIFIERS = [
  {
    id: 'fork', name: 'Bifurcación', description: 'Dos proyectiles secundarios al lanzar.',
    onSpawn(projectile) {
      if (projectile.secondary || !projectile.isMobile) return;
      for (const offset of [-0.28, 0.28]) {
        projectile.spawnSecondary(projectile.angleRadians + offset, 0.55);
      }
    },
  },
  {
    id: 'focus', name: 'Foco arcano', description: 'Cada carga aumenta el daño un 25%.',
    onSpawn(projectile, stacks) {
      projectile.damage *= 1 + 0.25 * stacks;
    },
  },
  {
    id: 'needle', name: 'Perforación', description: 'Atraviesa a un enemigo por carga.',
    onSpawn(projectile, stacks) {
      if (projectile.isMobile) projectile.remainingPierce += stacks;
    },
  },
  {
    id: 'growth', name: 'Expansión', description: 'El área crece hasta un 35% por carga.',
    onUpdate(projectile, stacks) {
      if (projectile.radius > 0) {
        const progress = Math.min(1, projectile.age / Math.min(450, projectile.lifetime));
        projectile.currentRadius = projectile.radius * (1 + 0.35 * stacks * progress);
      }
    },
  },
  {
    id: 'embers', name: 'Ascuas', description: 'Quema al enemigo durante 2 segundos.',
    onHit(projectile, enemy, stacks) {
      enemy.applyBurn(projectile.damage * 0.20 * stacks);
    },
  },
  {
    id: 'frost', name: 'Escarcha', description: 'Ralentiza al enemigo durante 1,2 segundos.',
    onHit(projectile, enemy, stacks) {
      enemy.applySlow(Math.max(0.35, 1 - 0.17 * stacks));
    },
  },
  {
    id: 'chain', name: 'Descarga', description: 'Salta a un enemigo cercano por carga.',
    onHit(projectile, enemy, stacks) {
      projectile.scene.chainDamage(enemy, projectile.damage * 0.45, stacks, projectile.color);
    },
  },
];

export const MODIFIER_BY_ID = Object.fromEntries(SPELL_MODIFIERS.map((modifier) => [modifier.id, modifier]));

// Las cargas de Bifurcación ya añaden dos disparos en el primer nivel.
// Se limita a uno para mantener legibles el patrón y los efectos al impactar.
export const MAX_MODIFIER_STACKS = { fork: 1, focus: 3, needle: 3, growth: 3, embers: 3, frost: 3, chain: 3 };
