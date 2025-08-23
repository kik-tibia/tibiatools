import type { ActivePerk } from "./perk-types";

export type BuildInputs = {
    level: string | number | null;
    bonus: string | number | null;
    skill: string | number | null;
    magicLevel: string | number | null;
    weapon: string | number | null;
};

export type CalculatorState = {
    v: 1;                  // schema version
    showSecondBuild: boolean;
    A: { inputs: BuildInputs; perks: ActivePerk[] };
    B: { inputs: BuildInputs; perks: ActivePerk[] };
};

export const defaultState = (): CalculatorState => ({
    v: 1,
    showSecondBuild: false,
    A: { inputs: { level: "", bonus: "", skill: "", magicLevel: "", weapon: "" }, perks: [] },
    B: { inputs: { level: "", bonus: "", skill: "", magicLevel: "", weapon: "" }, perks: [] },
});
