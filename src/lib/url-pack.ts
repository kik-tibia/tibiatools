import LZString from "lz-string";
import type {
  Build,
  BuildStats,
  CalculatorState,
  CollapsedSections,
  CreatureChoiceRef,
  ImbuementElement,
  PerkChoiceRef,
  SpellChoiceRef,
  Vocation,
  WeaponChoiceRef,
} from "./build-state";

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
  "transcendenceChance",
  "baseMagicLevel",
  "axe",
  "club",
  "sword",
  "fist",
  "distance",
  "shielding",
  "fishing",
  "imbuementElement",
  "imbuementValue",
];

const VOC_TO_NUM: Record<Vocation, number> = { knight: 0, paladin: 1, sorcerer: 2, druid: 3, monk: 4 };
const NUM_TO_VOC: Vocation[] = ["knight", "paladin", "sorcerer", "druid", "monk"];

const ELEM_TO_NUM: Record<ImbuementElement, number> = { death: 0, earth: 1, energy: 2, fire: 3, ice: 4 };
const NUM_TO_ELEM: ImbuementElement[] = ["death", "earth", "energy", "fire", "ice"];

const IMBUE_VAL_TO_TIER: Record<number, number> = { 0.1: 1, 0.25: 2, 0.5: 3 };
const TIER_TO_IMBUE_VAL: Record<number, number> = { 1: 0.1, 2: 0.25, 3: 0.5 };

type CompactStats = (string | number | null)[];
type CompactWeapon = number | [number, number];
type CompactPerk = [number, number];
type CompactRotation = [number, number, number, number];
type CompactTarget = [number, number] | [number, number, number, number];
type CompactBuildV1 = [CompactStats, CompactWeapon, CompactPerk[], CompactRotation[]];
type CompactBuild = [CompactStats, CompactWeapon, CompactPerk[], CompactRotation[], CompactTarget[]];
type CompactStateV1 = [number, CompactBuildV1, CompactBuildV1, number[], number[], number, number];
type CompactState = [number, CompactBuild, CompactBuild, number[], number[], number[], number, number];

export function compactStats(stats: BuildStats): CompactStats {
  let mask = 0;
  const values: (string | number)[] = [];
  STATS_KEYS.forEach((k, i) => {
    let v: string | number | null = stats[k] ?? null;
    if (k === "vocation" && typeof v === "string") v = VOC_TO_NUM[v as Vocation];
    if (k === "imbuementElement" && typeof v === "string") v = ELEM_TO_NUM[v as ImbuementElement];
    if (k === "imbuementValue" && typeof v === "number") v = IMBUE_VAL_TO_TIER[v];
    if (v !== null) {
      mask |= 1 << i;
      values.push(v);
    }
  });
  return [mask, ...values];
}

export function expandStats(compact: CompactStats): BuildStats {
  const mask = compact[0] as number;
  const stats: Partial<BuildStats> = {};
  let vi = 1;
  STATS_KEYS.forEach((k, i) => {
    if (mask & (1 << i)) {
      const v = compact[vi++];
      (stats as any)[k] =
        k === "vocation" && typeof v === "number"
          ? NUM_TO_VOC[v]
          : k === "imbuementElement" && typeof v === "number"
            ? NUM_TO_ELEM[v]
            : k === "imbuementValue" && typeof v === "number"
              ? TIER_TO_IMBUE_VAL[v]
              : v;
    } else {
      (stats as any)[k] = null;
    }
  });
  return stats as BuildStats;
}

export function compactWeapon(weapon: WeaponChoiceRef): CompactWeapon {
  return weapon.ammoId ? [weapon.id, weapon.ammoId] : weapon.id;
}

export function expandWeapon(compact: CompactWeapon): WeaponChoiceRef {
  if (typeof compact === "number") {
    return { id: compact };
  }
  return { id: compact[0], ammoId: compact[1] };
}

export function compactPerks(perks: PerkChoiceRef[]): CompactPerk[] {
  return perks.map((p) => [p.id, p.value]);
}

export function expandPerks(compact: CompactPerk[]): PerkChoiceRef[] {
  return compact.map(([id, value]) => ({ id, value }));
}

export function compactRotation(rotation: SpellChoiceRef[]): CompactRotation[] {
  return rotation.map((r) => [r.id, r.targets, r.ratio, +r.extraSpell]);
}

export function expandRotation(compact: CompactRotation[]): SpellChoiceRef[] {
  return compact.map(([id, targets, ratio, extraSpell]) => ({ id, targets, ratio, extraSpell: !!extraSpell }));
}

export function compactTargets(targets: CreatureChoiceRef[]): CompactTarget[] {
  return targets.map((t) =>
    t.charmId != null && t.charmTier != null ? [t.id, t.ratio, t.charmId, t.charmTier] : [t.id, t.ratio],
  );
}

export function expandTargets(compact: CompactTarget[]): CreatureChoiceRef[] {
  return compact.map((c) =>
    c.length === 4 ? { id: c[0], ratio: c[1], charmId: c[2], charmTier: c[3] } : { id: c[0], ratio: c[1] },
  );
}

function compactBuild(build: Build): CompactBuild {
  return [
    compactStats(build.stats),
    compactWeapon(build.weapon),
    compactPerks(build.perks),
    compactRotation(build.rotation),
    compactTargets(build.targets),
  ];
}

function expandBuild(compact: CompactBuild): Build {
  return {
    stats: expandStats(compact[0]),
    weapon: expandWeapon(compact[1]),
    perks: expandPerks(compact[2]),
    rotation: expandRotation(compact[3]),
    targets: expandTargets(compact[4] ?? []),
  };
}

function collapsedToBitmask(c: CollapsedSections): number {
  return (
    (c.basicStats ? 1 : 0) |
    (c.advancedStats ? 2 : 0) |
    (c.weapon ? 4 : 0) |
    (c.perks ? 8 : 0) |
    (c.rotation ? 16 : 0) |
    (c.targets ? 32 : 0)
  );
}

function bitmaskToCollapsed(mask: number): CollapsedSections {
  return {
    basicStats: !!(mask & 1),
    advancedStats: !!(mask & 2),
    weapon: !!(mask & 4),
    perks: !!(mask & 8),
    rotation: !!(mask & 16),
    targets: !!(mask & 32),
  };
}

function compactState(state: CalculatorState): CompactState {
  return [
    state.version,
    compactBuild(state.A),
    compactBuild(state.B),
    state.perkOrder,
    state.rotationOrder,
    state.targetOrder,
    +state.showSecondBuild,
    collapsedToBitmask(state.collapsed),
  ];
}

function expandBuildV1(compact: CompactBuildV1): Build {
  return {
    stats: expandStats(compact[0]),
    weapon: expandWeapon(compact[1]),
    perks: expandPerks(compact[2]),
    rotation: expandRotation(compact[3]),
    targets: [],
  };
}

function expandStateV1(compact: CompactStateV1): CalculatorState {
  return {
    version: 2,
    A: expandBuildV1(compact[1]),
    B: expandBuildV1(compact[2]),
    perkOrder: compact[3],
    rotationOrder: compact[4],
    targetOrder: [],
    showSecondBuild: !!compact[5],
    collapsed: bitmaskToCollapsed(compact[6]),
  };
}

function expandState(compact: CompactState): CalculatorState {
  if (compact[0] === 1) {
    return expandStateV1(compact as unknown as CompactStateV1);
  }
  return {
    version: compact[0],
    A: expandBuild(compact[1]),
    B: expandBuild(compact[2]),
    perkOrder: compact[3],
    rotationOrder: compact[4],
    targetOrder: compact[5],
    showSecondBuild: !!compact[6],
    collapsed: bitmaskToCollapsed(compact[7]),
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
