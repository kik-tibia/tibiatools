import creaturesRaw from "@data/creatures.json";

export type Creature = {
  id: number;
  name: string;
  bestiaryClass: string;
  bestiaryLevel: string;
  occurrence: string;
  charmPoints: number;
  experience: number;
  hitpoints: number;
  armor: number;
  mitigation: number;
  physicalDmgMod: number;
  earthDmgMod: number;
  fireDmgMod: number;
  deathDmgMod: number;
  energyDmgMod: number;
  holyDmgMod: number;
  iceDmgMod: number;
  healMod: number;
};

export const creatures: Creature[] = creaturesRaw as Creature[];
