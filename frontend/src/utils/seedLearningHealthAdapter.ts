/**
 * Adapts Seed GET /api/v2/learning/health (OpenAPI on 8182) to LearningStatusResponse
 * expected by MLLearningTab (legacy dashboard/learning-status shape).
 */

import type { ArmWeightItem, LearningStatusResponse } from '../types/apiModels';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function adaptSeedLearningHealthToLearningStatus(raw: unknown): LearningStatusResponse | null {
  if (!isRecord(raw)) return null;
  const armsBlock = raw.arms;
  if (!isRecord(armsBlock)) return null;
  const list = armsBlock.arms;
  if (!Array.isArray(list) || list.length === 0) return null;

  const rows: { arm: string; weight: number }[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const arm = typeof item.arm === 'string' ? item.arm : '';
    const w = typeof item.thompson_weight === 'number' ? item.thompson_weight : 0;
    if (arm) rows.push({ arm, weight: w });
  }
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => b.weight - a.weight);
  const top10 = sorted.slice(0, 10);
  const bottom5 = [...rows].sort((a, b) => a.weight - b.weight).slice(0, 5);

  const toArmWeight = (x: { arm: string; weight: number }): ArmWeightItem => ({
    arm: x.arm,
    weight: x.weight,
    alpha: 0,
    beta: 0,
  });

  const all_weights: Record<string, number> = {};
  for (const r of rows) {
    all_weights[r.arm] = r.weight;
  }

  const totalArms = typeof armsBlock.total === 'number' ? armsBlock.total : rows.length;

  return {
    total_arms: totalArms,
    top_10: top10.map(toArmWeight),
    bottom_5: bottom5.map(toArmWeight),
    all_weights,
  };
}
