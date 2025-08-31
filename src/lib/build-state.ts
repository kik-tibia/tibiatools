import type { ActivePerk } from "./perk-types";

export type BuildStats = {
    level: string | number | null;
    bonus: string | number | null;
    skill: string | number | null;
    magicLevel: string | number | null;
    weapon: string | number | null;
};

export type Build = { stats: BuildStats; perks: ActivePerk[] };

export type CalculatorState = {
    showSecondBuild: boolean;
    A: Build;
    B: Build;
};

export const defaultState = (): CalculatorState => ({
    showSecondBuild: false,
    A: { stats: { level: "", bonus: "", skill: "", magicLevel: "", weapon: "" }, perks: [] },
    B: { stats: { level: "", bonus: "", skill: "", magicLevel: "", weapon: "" }, perks: [] },
});
