export type UpgradeId = 'power' | 'rails' | 'silk' | 'pockets' | 'sight' | 'reserve';

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  detail: string;
  color: number;
}

export const UPGRADES: UpgradeDefinition[] = [
  { id: 'power', name: 'HEAVY BREAK', description: '+22% shot power', detail: 'Strike harder and open dense clusters.', color: 0xe8c547 },
  { id: 'rails', name: 'RAIL MASTER', description: 'Stronger rail rebounds', detail: 'Bank shots keep more of their speed.', color: 0x3b82c4 },
  { id: 'silk', name: 'SILK CLOTH', description: 'Balls roll farther', detail: 'Lower table friction rewards clean angles.', color: 0x2a9d78 },
  { id: 'pockets', name: 'WIDE MOUTHS', description: 'Larger pockets', detail: 'Pocket detection is more forgiving.', color: 0xc9484a },
  { id: 'sight', name: 'GHOST LINE', description: 'Longer aim guide', detail: 'See more of the line before you shoot.', color: 0x8c59b9 },
  { id: 'reserve', name: 'EXTRA CREDIT', description: '+2 shots per stage', detail: 'Add two shots to every new table.', color: 0xe78b3c },
];

export function chooseUpgradeOffer(stageNumber: number, owned: UpgradeId[]): UpgradeDefinition[] {
  const available = UPGRADES.filter((upgrade) => upgrade.id === 'reserve' || owned.filter((id) => id === upgrade.id).length < 3);
  const shuffled = [...available];
  let seed = (0x9e3779b9 ^ (stageNumber * 0x45d9f3b)) >>> 0;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) + 0x27100001) >>> 0;
    const index = seed % (i + 1);
    [shuffled[i], shuffled[index]] = [shuffled[index], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

export function upgradeLevel(owned: UpgradeId[], id: UpgradeId): number {
  return owned.filter((entry) => entry === id).length;
}
