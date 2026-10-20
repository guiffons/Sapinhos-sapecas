/**
 * Biological synergies and mutation logic
 */

export interface SynergyDef {
  id: string;
  name: string;
  desc: string;
  icon: number;
  check: (weapon: number, items: number[]) => boolean;
}

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'shoal',
    name: 'CARDUME VORAZ',
    desc: 'Girinos teleguiados c/ cauda +2 projéteis!',
    icon: 11,
    check: (w, items) => w === 1 && (items.includes(5) || items.includes(11)),
  },
  {
    id: 'hydra',
    name: 'LÍNGUA HIDRA',
    desc: '3 Línguas em leque que puxam Moscas de Ouro!',
    icon: 8,
    check: (w, items) => w === 3 && (items.includes(8) || items.includes(7)),
  },
  {
    id: 'mortar',
    name: 'MORTEIRO SALTITANTE',
    desc: 'Morteiro quica 2x criando explosões e poças!',
    icon: 10,
    check: (w, items) => w === 4 && (items.includes(10) || items.includes(15)),
  },
  {
    id: 'prism',
    name: 'PRISMA ABISSAL',
    desc: 'Feixe Hipno reflete nas paredes em zigue-zague!',
    icon: 4,
    check: (w, items) => w === 5 && (items.includes(10) || items.includes(4)),
  },
  {
    id: 'foam',
    name: 'DILÚVIO DE ESPUMA',
    desc: 'Bolhas crescem e se dividem em 3 gotas ácidas!',
    icon: 9,
    check: (w, items) => w === 2 && (items.includes(9) || items.includes(15)),
  },
  {
    id: 'royal',
    name: 'VENENO REAL',
    desc: 'Cuspe neon deixa rastro contínuo de ácido!',
    icon: 0,
    check: (w, items) => w === 0 && items.includes(0) && items.includes(4),
  },
];

/**
 * Checks which synergies are currently active given weapon and collected items.
 */
export function getActiveSynergies(weapon: number, items: number[]): SynergyDef[] {
  return SYNERGIES.filter(syn => syn.check(weapon, items));
}

/**
 * Checks if a specific synergy is active.
 */
export function hasSynergy(activeSynergies: Record<string, number>, id: string): boolean {
  return !!activeSynergies[id];
}
