import { allCharms, type Charm } from "@data/charms";
import { allCreatures, type Creature } from "@data/creatures";
import { allPerks, type Perk } from "@data/perks";
import { allSpells, type Spell, type SpellDamage } from "@data/spells";
import { allAmmo, allWeapons, type Ammo, type Weapon } from "@data/weapons";
import type { CreatureChoiceRef, PerkChoiceRef, SpellChoiceRef, WeaponChoiceRef } from "@lib/build-state";
import type { CreatureChoice, PerkChoice, SpellChoice, SpellDamageChoice, WeaponChoice } from "./types";

const weaponsById: Record<number, Weapon> = Object.fromEntries(allWeapons.map((i) => [i.id, i]));
const ammoById: Record<number, Ammo> = Object.fromEntries(allAmmo.map((i) => [i.id, i]));
const perkDefsById: Record<number, Perk> = Object.fromEntries(allPerks.map((i) => [i.id, i]));
const spellDefsById: Record<number, Spell> = Object.fromEntries(allSpells.map((i) => [i.id, i]));
const creaturesById: Record<number, Creature> = Object.fromEntries(allCreatures.map((i) => [i.id, i]));
const charmsById: Record<number, Charm> = Object.fromEntries(allCharms.map((i) => [i.id, i]));

export function resolveWeapon(weaponChoiceRef: WeaponChoiceRef): WeaponChoice {
  const weapon = weaponsById[weaponChoiceRef.id];
  const ammo = weaponChoiceRef.ammoId ? ammoById[weaponChoiceRef.ammoId] : undefined;
  return { ...weaponChoiceRef, weapon, ammo };
}

export function resolvePerks(perkChoiceRefs: PerkChoiceRef[]): PerkChoice[] {
  return perkChoiceRefs
    .map((p) => {
      const perk = perkDefsById[p.id];
      if (!perk) {
        console.warn(`Unknown perk id: ${p.id}`);
        return null;
      }
      return { ...p, perk };
    })
    .filter((x): x is PerkChoice => x !== null);
}

export function resolveSpells(spellChoiceRefs: SpellChoiceRef[]): SpellChoice[] {
  return spellChoiceRefs
    .map((s) => {
      const spell = spellDefsById[s.id];
      if (!spell) {
        console.warn(`Unknown spell id: ${s.id}`);
        return null;
      }
      return { ...s, spell };
    })
    .filter((x): x is SpellChoice => x !== null);
}

export function resolveSpellDamages(
  spellChoiceRefs: SpellChoiceRef[],
  spellDamages: SpellDamage[],
): SpellDamageChoice[] {
  const spellDamagesById: Record<number, SpellDamage> = Object.fromEntries(spellDamages.map((i) => [i.id, i]));
  return spellChoiceRefs
    .map((s) => {
      const spellDamage = spellDamagesById[s.id];
      if (!spellDamage) {
        console.warn(`Unknown spell id: ${s.id}`);
        return null;
      }
      return { ...s, spellDamage };
    })
    .filter((x): x is SpellDamageChoice => x !== null);
}

export function resolveCreatures(creatureChoiceRefs: CreatureChoiceRef[]): CreatureChoice[] {
  return creatureChoiceRefs
    .map((t) => {
      const creature = creaturesById[t.id];
      if (!creature) {
        console.warn(`Unknown creature id: ${t.id}`);
        return null;
      }
      let charm;
      if (t.charmId) {
        charm = charmsById[t.charmId];
        if (!charm) {
          console.warn(`Unknown charm id: ${t.charmId}`);
          return null;
        }
      }
      return { ...t, creature, ...(charm && { charm }) };
    })
    .filter((x): x is CreatureChoice => x !== null);
}
