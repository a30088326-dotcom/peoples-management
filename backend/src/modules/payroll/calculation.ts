import { z } from 'zod';

export const periodSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/, 'Choose a valid payroll month.');
const money = z.number().finite().min(0).max(100_000_000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, 'Use at most two decimal places.');
export const profileSchema = z.object({ employeeId: z.string().min(1).max(36), effectiveMonth: periodSchema,
  basic: money.refine(value => value > 0, 'Enter a positive monthly basic salary.'), allowance: money, loan: money, enabled: z.boolean() });
export const rulesSchema = z.object({ effectiveMonth: periodSchema,
  otDivisor: z.number().int().min(1).max(31), hoursPerDay: z.number().min(1).max(24), otMultiplier: z.number().min(1).max(10),
  noPayBasis: z.enum(['roster', 'fixed']), fixedDivisor: z.number().int().min(1).max(31),
  allowanceEligible: z.boolean(), serviceEligible: z.boolean(), otEligible: z.boolean(),
  taxMode: z.enum(['verified-input', 'table01-2025-26']),
});
export const inputSchema = z.object({ employeeId: z.string().min(1).max(36), service: money,
  otHours: z.number().finite().min(0).max(744), apit: money.nullable(), checked: z.boolean() });
export type Profile = z.infer<typeof profileSchema>;
export type Rules = z.infer<typeof rulesSchema>;
export type Input = z.infer<typeof inputSchema>;
export const defaultRules: Omit<Rules, 'effectiveMonth'> = {
  otDivisor: 26, hoursPerDay: 8, otMultiplier: 1.5, noPayBasis: 'roster', fixedDivisor: 30,
  allowanceEligible: true, serviceEligible: true, otEligible: false, taxMode: 'verified-input',
};
const cents = (amount: number) => Math.round(amount * 100);
const rupees = (amount: number) => amount / 100;

// The POC's Table 01 bands, limited to the published assessment year and regular primary earnings.
export function regularApit(gross: number) {
  const bands = [[150000, 0, 0], [233333, 6, 9000], [275000, 18, 37000],
    [316667, 24, 53500], [358333, 30, 72500], [Infinity, 36, 94000]];
  const [, rate, relief] = bands.find(([limit]) => gross <= limit)!;
  return Math.max(0, Math.round(gross * rate / 100 - relief));
}

export function calculate(profile: Profile, rules: Rules, values: Pick<Input, 'service' | 'otHours' | 'apit'>,
  rosterDays: number, unpaidDays: number) {
  const divisor = rules.noPayBasis === 'roster' ? rosterDays : rules.fixedDivisor;
  if (unpaidDays < 0 || unpaidDays > rosterDays || (unpaidDays > 0 && divisor < unpaidDays)) {
    throw new Error('Unpaid leave exceeds the payroll working-day basis.');
  }
  const noPay = unpaidDays ? Math.round(cents(profile.basic) * unpaidDays / divisor) : 0;
  const earnedBasic = cents(profile.basic) - noPay;
  const allowance = cents(profile.allowance), service = cents(values.service), loan = cents(profile.loan);
  const overtime = Math.round(cents(profile.basic) * rules.otMultiplier * values.otHours / (rules.otDivisor * rules.hoursPerDay));
  const gross = earnedBasic + allowance + service + overtime;
  const base = earnedBasic + (rules.allowanceEligible ? allowance : 0) + (rules.serviceEligible ? service : 0) + (rules.otEligible ? overtime : 0);
  const employeeEpf = Math.round(base * 0.08), employerEpf = Math.round(base * 0.12), etf = Math.round(base * 0.03);
  const apit = cents(rules.taxMode === 'verified-input' ? values.apit ?? 0 : regularApit(rupees(gross)));
  const deductions = employeeEpf + apit + loan;
  return { noPay: rupees(noPay), earnedBasic: rupees(earnedBasic), allowance: rupees(allowance), service: rupees(service),
    overtime: rupees(overtime), gross: rupees(gross), base: rupees(base), employeeEpf: rupees(employeeEpf),
    employerEpf: rupees(employerEpf), etf: rupees(etf), apit: rupees(apit), loan: rupees(loan),
    deductions: rupees(deductions), net: rupees(gross - deductions), employerCost: rupees(gross + employerEpf + etf) };
}
export type Amounts = ReturnType<typeof calculate>;
