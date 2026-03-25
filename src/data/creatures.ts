import bestiaryRaw from "@data/bestiary.json";
import bestiaryIdsRaw from "@data/bestiary-ids.json";

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

export const creatures: Creature[] = bestiaryRaw.map((b1) => ({
  ...b1,
  ...bestiaryIdsRaw.find((b2) => b2.name === b1.name),
})) as unknown[] as Creature[];

// TODO
// no I don't like this approach.
// let's keep bestiary-ids.json as a manually managed file and bestiary.json as a regularly downloaded file, but instead store them in scripts/, and have another script to create a proper bestiary.json file that goes into src/data/ with the ids inserted
