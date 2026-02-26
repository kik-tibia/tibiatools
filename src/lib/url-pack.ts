import LZString from "lz-string";
import type { CalculatorState, Build, BuildStats, CollapsedSections, Vocation } from "./build-state";
import type { ActivePerk, RotationSpell, WeaponBuild } from "./damage-calc";

/**
 * State = [BuildA, BuildB, showSecondBuild]
 * Build = [Stats, Weapon, Perks, Rotation]
 * Stats = [presenceBitmask, ...nonNullValues]
 * Weapon = "id" | ["id", "ammoId"]
 * Perks = [[id, value], ...]
 * Rotation = [[id, targets, ratio], ...]
 */

// Stats field order - MUST remain stable
const STATS_KEYS: (keyof BuildStats)[] = [
  "vocation",
  "level",
  "bonus",
  "skill",
  "magicLevel",
  "critChance",
  "critDamage",
  "fatalChance",
  "baseMagicLevel",
  "axe",
  "club",
  "sword",
  "fist",
  "distance",
  "shielding",
  "fishing",
];

const VOC_TO_NUM: Record<Vocation, number> = { knight: 0, paladin: 1, sorcerer: 2, druid: 3, monk: 4 };
const NUM_TO_VOC: Vocation[] = ["knight", "paladin", "sorcerer", "druid", "monk"];

type CompactStats = (string | number | null)[];
type CompactWeapon = string | [string, string];
type CompactPerk = [string, number];
type CompactRotation = [string, number, number];
type CompactBuild = [CompactStats, CompactWeapon, CompactPerk[], CompactRotation[]];
type CompactState = [CompactBuild, CompactBuild, string[], string[], boolean, number];

function compactStats(stats: BuildStats): CompactStats {
  let mask = 0;
  const values: (string | number)[] = [];
  STATS_KEYS.forEach((k, i) => {
    let v: string | number | null = stats[k] ?? null;
    if (k === "vocation" && typeof v === "string") v = VOC_TO_NUM[v as Vocation];
    if (v !== null) {
      mask |= 1 << i;
      values.push(v);
    }
  });
  return [mask, ...values];
}

function expandStats(compact: CompactStats): BuildStats {
  const mask = compact[0] as number;
  const stats: Partial<BuildStats> = {};
  let vi = 1;
  STATS_KEYS.forEach((k, i) => {
    if (mask & (1 << i)) {
      const v = compact[vi++];
      (stats as any)[k] = k === "vocation" && typeof v === "number" ? NUM_TO_VOC[v] : v;
    } else {
      (stats as any)[k] = null;
    }
  });
  return stats as BuildStats;
}

function compactWeapon(weapon: WeaponBuild): CompactWeapon {
  return weapon.ammo ? [weapon.id, weapon.ammo] : weapon.id;
}

function expandWeapon(compact: CompactWeapon): WeaponBuild {
  if (typeof compact === "string") {
    return { id: compact };
  }
  return { id: compact[0], ammo: compact[1] };
}

function compactPerks(perks: ActivePerk[]): CompactPerk[] {
  return perks.map((p) => [p.id, p.value]);
}

function expandPerks(compact: CompactPerk[]): ActivePerk[] {
  return compact.map(([id, value]) => ({ id, value }));
}

function compactRotation(rotation: RotationSpell[]): CompactRotation[] {
  return rotation.map((r) => [r.id, r.targets, r.ratio]);
}

function expandRotation(compact: CompactRotation[]): RotationSpell[] {
  return compact.map(([id, targets, ratio]) => ({ id, targets, ratio }));
}

function compactBuild(build: Build): CompactBuild {
  return [
    compactStats(build.stats),
    compactWeapon(build.weapon),
    compactPerks(build.perks),
    compactRotation(build.rotation),
  ];
}

function expandBuild(compact: CompactBuild): Build {
  return {
    stats: expandStats(compact[0]),
    weapon: expandWeapon(compact[1]),
    perks: expandPerks(compact[2]),
    rotation: expandRotation(compact[3]),
  };
}

function collapsedToBitmask(c: CollapsedSections): number {
  return (
    (c.basicStats ? 1 : 0) | (c.advancedStats ? 2 : 0) | (c.weapon ? 4 : 0) | (c.perks ? 8 : 0) | (c.rotation ? 16 : 0)
  );
}

function bitmaskToCollapsed(mask: number): CollapsedSections {
  return {
    basicStats: !!(mask & 1),
    advancedStats: !!(mask & 2),
    weapon: !!(mask & 4),
    perks: !!(mask & 8),
    rotation: !!(mask & 16),
  };
}

function compactState(state: CalculatorState): CompactState {
  return [compactBuild(state.A), compactBuild(state.B), state.perkOrder, state.rotationOrder, state.showSecondBuild, collapsedToBitmask(state.collapsed)];
}

function expandState(compact: CompactState): CalculatorState {
  return {
    A: expandBuild(compact[0]),
    B: expandBuild(compact[1]),
    perkOrder: compact[2],
    rotationOrder: compact[3],
    showSecondBuild: compact[4],
    collapsed: bitmaskToCollapsed(compact[5]),
  };
}

export function packState(state: CalculatorState): string {
  const compact = compactState(state);
  const json = JSON.stringify(compact);
  console.log(json);
  return LZString.compressToEncodedURIComponent(json);
}

export function unpackState(s: string | null): CalculatorState | null {
  if (!s) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(s);
    if (!json) return null;
    const compact = JSON.parse(json) as CompactState;
    return expandState(compact);
  } catch {
    return null;
  }
}
