type SearchableEmployee = { name?: string; employeeNumber?: string; department?: string; designation?: string; managerName?: string; organizationalRank?: string };
export function matchesEmployee(employee: SearchableEmployee | undefined, query: string) {
  const value=[employee?.name,employee?.employeeNumber,employee?.department,employee?.designation,employee?.managerName,employee?.organizationalRank].filter(Boolean).join(' ').normalize('NFKC').toLowerCase();
  return query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean).every(word=>value.includes(word));
}
