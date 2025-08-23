export type ActivePerk = {
    id: string;                     // references PerkDef.id
    values: Record<string, number | string>; // key -> user-entered value
};
