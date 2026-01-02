import LZString from "lz-string";
import type { CalculatorState, Build, BuildStats } from "./build-state";
import type { ActivePerk, RotationSpell, WeaponBuild } from "./damage-calc";

/**
 * State = [BuildA, BuildB, showSecondBuild]
 * Build = [Stats, Weapon, Perks, Rotation]
 * Stats = [vocation, level, bonus, ... ]
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

type CompactStats = (string | number | null)[];
type CompactWeapon = string | [string, string];
type CompactPerk = [string, number];
type CompactRotation = [string, number, number];
type CompactBuild = [CompactStats, CompactWeapon, CompactPerk[], CompactRotation[]];
type CompactState = [CompactBuild, CompactBuild, boolean];

function compactStats(stats: BuildStats): CompactStats {
  return STATS_KEYS.map((k) => stats[k] ?? null);
}

function expandStats(compact: CompactStats): BuildStats {
  const stats: Partial<BuildStats> = {};
  STATS_KEYS.forEach((k, i) => {
    (stats as any)[k] = compact[i];
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

function compactState(state: CalculatorState): CompactState {
  return [compactBuild(state.A), compactBuild(state.B), state.showSecondBuild];
}

function expandState(compact: CompactState): CalculatorState {
  return {
    A: expandBuild(compact[0]),
    B: expandBuild(compact[1]),
    showSecondBuild: compact[2],
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
