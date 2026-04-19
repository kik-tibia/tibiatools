export type ForgeInputs = {
  baseCost: number;
  baseCostSameSlot: number;
  bisCost: number;
  sliverCost: number;
};

export type FusionRow = {
  tier: number;
  goldFee: number;
  totalCost: number;
};

export type ConvFusionRow = {
  tier: number;
  goldFee: number;
  totalCost: number;
};

export type ConvTransferRow = {
  tier: number;
  goldFee: number;
  cores: number;
  totalCost: number;
};

export type TransferRow = {
  tier: number;
  goldFee: number;
  totalCost: number;
};

export type ForgeResult = {
  baseFusion: FusionRow[];
  sameSlotFusion: FusionRow[];
  convergenceFusion: ConvFusionRow[];
  convergenceTransfer: ConvTransferRow[];
  transfer: TransferRow[];
};

export const FUSION_GOLD_FEES = [0, 8e6, 2e7, 4e7, 6.5e7, 1e8, 2.5e8, 7.5e8, 2.5e9, 8e9, 1.5e10];

export const CONVERGENCE_FUSION_FEES = [0, 5.5e7, 1.1e8, 1.7e8, 3e8, 8.75e8, 2.35e9, 6.95e9, 2.125e10, 5e10, 1.25e11];

export const CONVERGENCE_TRANSFER_FEES = [0, 6.5e7, 1.65e8, 3.75e8, 8e8, 2e9, 5.25e9, 1.45e10, 4.25e10, 1e11, 3e11];

export const CONVERGENCE_TRANSFER_CORES = [0, 1, 2, 5, 10, 15, 25, 35, 50, 60, 85];

export const TRANSFER_FEES = [0, 2e7, 4e7, 6.5e7, 1e8, 2.5e8, 7.5e8, 2.5e9, 8e9, 1.5e10];

export const P_SUCCESS = 0.65;
export const P_WEAK_FAIL = 0.175;

export function computeForge(inputs: ForgeInputs): ForgeResult {
  const { baseCost, baseCostSameSlot, bisCost, sliverCost } = inputs;

  const E: number[] = [baseCost];
  const baseFusion: FusionRow[] = [{ tier: 0, goldFee: 0, totalCost: baseCost }];
  for (let k = 1; k <= 10; k++) {
    const fee = FUSION_GOLD_FEES[k];
    const repair = k === 1 ? E[0] : E[k - 1] - E[k - 2];
    const extra = (fee + 100 * sliverCost + P_WEAK_FAIL * repair) / P_SUCCESS;
    const total = 2 * E[k - 1] + extra;
    E.push(total);
    baseFusion.push({ tier: k, goldFee: fee, totalCost: total });
  }

  const K: number[] = [baseCostSameSlot];
  const sameSlotFusion: FusionRow[] = [{ tier: 0, goldFee: 0, totalCost: baseCostSameSlot }];
  for (let k = 1; k <= 10; k++) {
    const fee = FUSION_GOLD_FEES[k];
    const repair = k === 1 ? K[0] : K[k - 1] - K[k - 2];
    const extra = (fee + 100 * sliverCost + P_WEAK_FAIL * repair) / P_SUCCESS;
    const total = 2 * K[k - 1] + extra;
    K.push(total);
    sameSlotFusion.push({ tier: k, goldFee: fee, totalCost: total });
  }

  const convergenceFusion: ConvFusionRow[] = [{ tier: 0, goldFee: 0, totalCost: bisCost }];
  for (let k = 1; k <= 10; k++) {
    const fee = CONVERGENCE_FUSION_FEES[k];
    const total = fee + convergenceFusion[k - 1].totalCost + K[k - 1];
    convergenceFusion.push({ tier: k, goldFee: fee, totalCost: total });
  }

  const convergenceTransfer: ConvTransferRow[] = [{ tier: 0, goldFee: 0, cores: 0, totalCost: bisCost }];
  for (let k = 1; k <= 10; k++) {
    const fee = CONVERGENCE_TRANSFER_FEES[k];
    const cores = CONVERGENCE_TRANSFER_CORES[k];
    const total = bisCost + fee + 50 * cores * sliverCost + E[k];
    convergenceTransfer.push({ tier: k, goldFee: fee, cores, totalCost: total });
  }

  const transfer: TransferRow[] = [{ tier: 0, goldFee: 0, totalCost: bisCost }];
  for (let k = 1; k <= 9; k++) {
    const fee = TRANSFER_FEES[k];
    const total = fee + bisCost + E[k + 1];
    transfer.push({ tier: k, goldFee: fee, totalCost: total });
  }

  return { baseFusion, sameSlotFusion, convergenceFusion, convergenceTransfer, transfer };
}
