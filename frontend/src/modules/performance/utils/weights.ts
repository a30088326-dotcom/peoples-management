import type { Competency, Template } from '../types';

/** Keep the individual competency weights in step with the headline split. */
export function withGoalWeight(template: Template, goalWeight: number): Template {
  const competencies: Competency[] = template.competencies;
  if (!competencies.length || !Number.isFinite(goalWeight) || goalWeight < 5 || goalWeight > 95) return template;

  const targetCents = Math.round((100 - goalWeight) * 100);
  const distributable = targetCents - competencies.length;
  const current = competencies.map(item => Math.max(0, item.weight));
  const currentTotal = current.reduce((sum, weight) => sum + weight, 0);
  const portions = current.map(weight => distributable * (currentTotal ? weight / currentTotal : 1 / competencies.length));
  const whole = portions.map(Math.floor);
  const remaining = distributable - whole.reduce((sum, value) => sum + value, 0);
  const order = portions.map((value, index) => ({ index, fraction: value - whole[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remaining; index++) whole[order[index].index]++;

  return {
    ...template,
    goalWeight,
    competencies: competencies.map((item, index) => ({ ...item, weight: (whole[index] + 1) / 100 })),
  };
}
