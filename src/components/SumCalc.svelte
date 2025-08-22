<script lang="ts">
    import { onMount } from "svelte";

    // inputs may come as string/number/null from the DOM; keep them flexible
    let a: string | number | null = "";
    let b: string | number | null = "";

    // derived numbers (always coerce → trim → number)
    $: aNum = Number((a ?? "").toString().trim()) || 0;
    $: bNum = Number((b ?? "").toString().trim()) || 0;
    $: sum = aNum + bNum;

    // ---- URL sync (client only) ----
    let mounted = false;

    function readFromUrl() {
        const p = new URLSearchParams(window.location.search);
        a = p.get("a") ?? "";
        b = p.get("b") ?? "";
    }

    function writeToUrl() {
        const p = new URLSearchParams(window.location.search);
        const sa = (a ?? "").toString().trim();
        const sb = (b ?? "").toString().trim();
        if (!sa) p.delete("a");
        else p.set("a", sa);
        if (!sb) p.delete("b");
        else p.set("b", sb);

        const qs = p.toString();
        const newUrl = qs
            ? `${window.location.pathname}?${qs}${window.location.hash}`
            : `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState(null, "", newUrl);
    }

    // debounce URL writes
    let t: number | undefined;
    function scheduleWrite() {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(writeToUrl, 150);
    }

    onMount(() => {
        mounted = true;
        readFromUrl();

        const onPop = () => readFromUrl();
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    });

    // update URL when inputs change, but only after mount
    $: if (mounted) {
        a;
        b;
        scheduleWrite();
    }

    // copy link
    let copied = false;
    async function copyLink() {
        await navigator.clipboard.writeText(window.location.href);
        copied = true;
        setTimeout(() => (copied = false), 1200);
    }
</script>

<form class="stack" on:submit|preventDefault>
    <label>
        <span>First number</span>
        <input
            type="number"
            bind:value={a}
            inputmode="decimal"
            placeholder="e.g. 12.5"
        />
    </label>

    <label>
        <span>Second number</span>
        <input
            type="number"
            bind:value={b}
            inputmode="decimal"
            placeholder="e.g. 3"
        />
    </label>
</form>

<p class="result">Sum: <strong>{sum}</strong></p>

<div class="row">
    <button type="button" on:click={copyLink}>
        {copied ? "Copied!" : "Copy shareable link"}
    </button>
    <button
        type="button"
        on:click={() => {
            a = "";
            b = "";
        }}
    >
        Reset
    </button>
</div>

<style>
    .stack {
        display: grid;
        gap: 0.75rem;
        max-width: 360px;
    }
    input {
        padding: 0.5rem;
        font: inherit;
    }
    .result {
        margin-top: 0.75rem;
        font-size: 1.125rem;
    }
    .row {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    button {
        padding: 0.5rem 0.75rem;
        border: 1px solid #bbb;
        border-radius: 0.5rem;
        background: transparent;
        cursor: pointer;
    }
</style>
