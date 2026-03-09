import weaponsRaw from "@data/weapons.json";
import ammoRaw from "@data/ammo.json";
import type { Element } from "@data/spells";

export type AmmoType = "arrows" | "bolts";
export type SkillType = "axe" | "club" | "sword" | "fist" | "distance";

export type Weapon = {
  id: number;
  name: string;
  attack?: number;
  attackDeath?: number;
  attackEarth?: number;
  attackEnergy?: number;
  attackFire?: number;
  attackIce?: number;
  ammo?: AmmoType;
  damageType?: Element;
  damage?: number;
  skill: SkillType;
  vocations: string[];
};

export const weapons: Weapon[] = weaponsRaw as Weapon[];

type AmmoRaw = {
  id: number;
  name: string;
  attack: number;
  aoe: boolean;
};

type AmmoData = {
  arrows: AmmoRaw[];
  bolts: AmmoRaw[];
};

export type Ammo = AmmoRaw & {
  type: AmmoType;
};

const ammoData = ammoRaw as AmmoData;

export const ammo: Ammo[] = [
  ...ammoData.arrows.map((a) => ({ ...a, type: "arrows" as const })),
  ...ammoData.bolts.map((a) => ({ ...a, type: "bolts" as const })),
];
