import LZString from "lz-string";
import type { CalculatorState } from "./build-state";

export function packState(state: CalculatorState): string {
    // Tip: ensure numbers not Infinity/NaN before JSON.stringify if needed
    const json = JSON.stringify(state);
    return LZString.compressToEncodedURIComponent(json); // URL-safe
}

export function unpackState(s: string | null): CalculatorState | null {
    if (!s) return null;
    try {
        const json = LZString.decompressFromEncodedURIComponent(s);
        if (!json) return null;
        const obj = JSON.parse(json);
        // Quick guard: require version
        if (!obj || typeof obj.v !== "number") return null;
        return obj as CalculatorState;
    } catch {
        return null;
    }
}
