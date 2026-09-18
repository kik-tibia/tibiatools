import { metaResourceNames } from "./metadata";
import { numericStatKeys } from "./parse-build";
import { charmTiers, imbuementElements, imbuementTierValues, vocations } from "./registry";

const nullableNumber = { type: ["number", "null"] as const };

const statDescriptions: Record<(typeof numericStatKeys)[number], string> = {
  level: "Character level.",
  bonus: "Flat damage from Wheel of Destiny.",
  skill: "Weapon skill.",
  magicLevel: "Magic level.",
  critChance: "Critical hit chance in percent.",
  critDamage: "Critical hit extra damage in percent.",
  fatalChance: "Fatal chance in percent.",
  transcendenceChance: "Transcendence chance in percent.",
  hitPoints: "Maximum hit points. Required for Overpower.",
  manaPoints: "Maximum mana points. Required for Overflux.",
  baseMagicLevel: "Base magic level without buffs. Required for Runic Mastery.",
  axe: "Axe fighting. Only needed when a perk scales off a skill other than the weapon's own.",
  club: "Club fighting. Only needed when a perk scales off a skill other than the weapon's own.",
  sword: "Sword fighting. Only needed when a perk scales off a skill other than the weapon's own.",
  fist: "Fist fighting. Only needed when a perk scales off a skill other than the weapon's own.",
  distance: "Distance fighting. Only needed when a perk scales off a skill other than the weapon's own.",
  shielding: "Shielding skill. Used by spells that scale with shielding.",
  fishing: "Fishing skill. Used by perks that scale with fishing.",
};

const statProperties = Object.fromEntries(
  numericStatKeys.map((key) => [key, { ...nullableNumber, description: statDescriptions[key] }]),
);

const exampleRequest = {
  stats: {
    vocation: "knight",
    level: 1000,
    bonus: 20,
    skill: 200,
    magicLevel: 13,
    critChance: 12,
    critDamage: 72,
  },
  weapon: { id: 658 },
  perks: [
    { id: 45, value: 11.5 },
    { id: 46, value: 8 },
    { id: 51, value: 12.5 },
    { id: 13, value: 10 },
  ],
  rotation: [
    { id: 1, targets: 1 },
    { id: 2, targets: 6.5, ratio: 30 },
    { id: 3, targets: 6, ratio: 28 },
    { id: 4, targets: 7, ratio: 26 },
    { id: 8, targets: 3, ratio: 8 },
    { id: 6, targets: 0.5, ratio: 8 },
  ],
  targets: [
    { id: 105, ratio: 208, charmId: 5, charmTier: 2 },
    { id: 618, ratio: 173 },
    { id: 659, ratio: 106 },
  ],
};

const description = `API for the Damage Calculator in JSON format.

\`POST /api/v1/damage\` takes one build and returns the results table: effective damage per turn, per hit, damage from charms, and
the raw and effective damage of every spell.

Builds are described with numeric ids for stances, weapons, ammo, shields, perks, spells, creatures and charms.
Look those up under \`/api/v1/meta\`, for example \`/api/v1/meta/weapons\`.

### Defaults

* \`stats.vocation\` is the only required field.
* Omitted numeric stats count as 0.
* \`weapon\` defaults to weapon id 1 (fists).
* \`rotation[].targets\` and \`rotation[].ratio\` default to 1. Auto-attack (spell id 1) ignores \`ratio\`.

### Errors

Unknown fields, wrong types and ids that don't exist are rejected with \`400\` and a list of \`issues\`.

### Rate limits

The \`/api/v1/damage\` endpoint has a limit of 1 request per second, with an initial burst of 10 requests.

`;

const schemas = {
  Vocation: {
    type: "string",
    enum: vocations,
    description: "Vocation of the build.",
  },
  ImbuementElement: {
    type: ["string", "null"],
    enum: [...imbuementElements, null],
    description: "Element of an elemental attack imbuement.",
  },
  BuildStats: {
    type: "object",
    required: ["vocation"],
    additionalProperties: false,
    description: "Character stats. Enter final values including buffs, as you would in the calculator.",
    properties: {
      vocation: { $ref: "#/components/schemas/Vocation" },
      stanceIds: {
        type: "array",
        items: { type: "integer" },
        description: "Active stance ids (see /api/v1/meta/stances). At most one per group.",
      },
      ...statProperties,
      imbuementElement: { $ref: "#/components/schemas/ImbuementElement" },
      imbuementValue: {
        type: ["number", "null"],
        enum: [...imbuementTierValues, null],
        description: `Fraction of physical attack converted to imbuementElement: ${imbuementTierValues
          .map((v, i) => `${v} (T${i + 1})`)
          .join(", ")}. Only for physical single-target weapons.`,
      },
    },
  },
  WeaponChoice: {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    description: "Only the weapon's attack value is used; its perks must be entered under `perks`.",
    properties: {
      id: { type: "integer", description: "Weapon id (see /api/v1/meta/weapons)." },
      ammoId: { type: "integer", description: "Ammunition id, for bows and crossbows (see /api/v1/meta/ammo)." },
      shieldId: { type: "integer", description: "Shield id, for one-handed weapons (see /api/v1/meta/shields)." },
    },
  },
  PerkChoice: {
    type: "object",
    required: ["id", "value"],
    additionalProperties: false,
    description:
      "One perk and its total value. Add up every source of the same perk and send the total. Perks that overlap with a stat (skill, crit chance, crit damage) must not be counted twice.",
    properties: {
      id: { type: "integer", description: "Perk id (see /api/v1/meta/perks)." },
      value: {
        type: "number",
        description:
          "Meaning depends on the perk's valueType: `percent` and `flat` take the in-game number, `stage` takes 0-3, `spellId` takes a rotation spell id, `ignored` takes anything.",
      },
    },
  },
  RotationEntry: {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    description:
      "One row of the rotation. Staged spells such as Ice Burst are a single cast spread over several rows: send every id in the spell's `bundledSpellIds` with the same `ratio`.",
    properties: {
      id: { type: "integer", description: "Spell id (see /api/v1/meta/spells)." },
      targets: {
        type: "number",
        default: 1,
        minimum: 0,
        description: "Average number of targets this row hits. Fractions are allowed.",
      },
      ratio: {
        type: "number",
        default: 1,
        minimum: 0,
        description:
          "How often this spell is cast relative to the others; only the proportions matter. Ignored for auto-attack.",
      },
    },
  },
  TargetChoice: {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    description:
      "A creature you fight. Each target is weighted by ratio × its hitpoints, so ratios can be raw bestiary kill counts.",
    properties: {
      id: { type: "integer", description: "Creature id (see /api/v1/meta/creatures)." },
      ratio: { type: "number", default: 1, minimum: 0, description: "How much of the fight this creature makes up." },
      charmId: {
        type: "integer",
        description: "Charm assigned to this creature (see /api/v1/meta/charms). Requires charmTier.",
      },
      charmTier: { type: "integer", enum: charmTiers, description: "Charm tier. Requires charmId." },
    },
  },
  DamageRequest: {
    type: "object",
    required: ["stats"],
    additionalProperties: false,
    properties: {
      stats: { $ref: "#/components/schemas/BuildStats" },
      weapon: { $ref: "#/components/schemas/WeaponChoice" },
      perks: { type: "array", items: { $ref: "#/components/schemas/PerkChoice" } },
      rotation: { type: "array", items: { $ref: "#/components/schemas/RotationEntry" } },
      targets: { type: "array", items: { $ref: "#/components/schemas/TargetChoice" } },
    },
    example: exampleRequest,
  },
  SpellDamage: {
    type: "object",
    required: ["id", "name", "raw", "effective"],
    properties: {
      id: { type: "integer" },
      name: { type: "string", description: "Name as the results table shows it." },
      raw: {
        type: "object",
        description: "Damage against a completely defenceless target, ignoring crits and fatals.",
        required: ["min", "avg", "max"],
        properties: {
          min: { type: ["number", "null"], description: "null when the minimum is unknown for this spell." },
          avg: { type: "number" },
          max: { type: ["number", "null"], description: "null when the maximum is unknown for this spell." },
        },
      },
      effective: {
        type: "object",
        description: "Damage after resistances, armor, mitigation, crits and fatals.",
        required: ["avg"],
        properties: {
          avg: { type: "number" },
        },
      },
    },
  },
  DamageResult: {
    type: "object",
    required: ["summary", "spells"],
    properties: {
      summary: {
        type: "object",
        required: ["effectiveDamagePerTurn", "effectiveDamagePerHit", "damageFromCharms"],
        properties: {
          effectiveDamagePerTurn: {
            type: "number",
            description: "Average damage per turn using the rotation, including all charms.",
          },
          effectiveDamagePerHit: {
            type: "number",
            description: "Average damage per hit using the rotation, including crit charms but not elemental charms.",
          },
          damageFromCharms: { type: "number", description: "Average damage per turn coming from charms." },
        },
      },
      spells: {
        type: "array",
        description: "Every spell the vocation can cast, in the calculator's own order.",
        items: { $ref: "#/components/schemas/SpellDamage" },
      },
    },
  },
  MetaItem: {
    type: "object",
    description: "Shape depends on the resource; every item has an `id` and a `name`.",
    required: ["id", "name"],
    properties: {
      id: { type: ["integer", "string"] },
      name: { type: "string" },
    },
    additionalProperties: true,
  },
  MetaList: {
    type: "object",
    required: ["resource", "description", "count", "items"],
    properties: {
      resource: { type: "string", enum: metaResourceNames },
      description: { type: "string" },
      count: { type: "integer", description: "Number of items in this resource." },
      items: { type: "array", items: { $ref: "#/components/schemas/MetaItem" } },
    },
  },
  MetaIndex: {
    type: "object",
    required: ["resources"],
    properties: {
      resources: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "description", "count", "url"],
          properties: {
            name: { type: "string", enum: metaResourceNames },
            description: { type: "string" },
            count: { type: "integer" },
            url: { type: "string" },
          },
        },
      },
    },
  },
  ErrorResponse: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["status", "message"],
        properties: {
          status: { type: "integer" },
          message: { type: "string" },
          issues: {
            type: "array",
            description: "One entry per field that has to change before the request can succeed.",
            items: {
              type: "object",
              required: ["field", "message"],
              properties: {
                field: { type: "string", description: "Path of the offending field, e.g. `rotation[2].id`." },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const jsonError = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
});

// No `servers` entry on purpose: the Swagger UI page then resolves these paths against the host it
// was loaded from, so "Try it out" works on both tibiatools.io and test.tibiatools.io.
export function openApiSpec(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "Damage Calculator API",
      version: "1.0.0",
      description,
    },
    tags: [
      { name: "Damage", description: "Calculate the damage of a build." },
      { name: "Metadata", description: "Names for the ids a build is built from." },
    ],
    paths: {
      "/api/v1/damage": {
        post: {
          tags: ["Damage"],
          summary: "Calculate damage for one build",
          operationId: "calculateDamage",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DamageRequest" },
                example: exampleRequest,
              },
            },
          },
          responses: {
            "200": {
              description: "Damage figures for the build.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/DamageResult" } } },
            },
            "400": jsonError("The body is not valid JSON, or the build has fields that must be fixed."),
            "405": jsonError("Wrong method: this endpoint only accepts POST."),
          },
        },
      },
      "/api/v1/meta": {
        get: {
          tags: ["Metadata"],
          summary: "List the metadata resources",
          operationId: "listMetaResources",
          responses: {
            "200": {
              description: "Every metadata resource, with its item count.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/MetaIndex" } } },
            },
          },
        },
      },
      "/api/v1/meta/{resource}": {
        get: {
          tags: ["Metadata"],
          summary: "List one metadata resource",
          operationId: "listMetaResource",
          parameters: [
            {
              name: "resource",
              in: "path",
              required: true,
              schema: { type: "string", enum: metaResourceNames },
              description: "Which resource to list.",
            },
          ],
          responses: {
            "200": {
              description: "Every item in the resource.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/MetaList" } } },
            },
            "404": jsonError("No such resource."),
          },
        },
      },
    },
    components: { schemas },
  };
}

export { exampleRequest };
