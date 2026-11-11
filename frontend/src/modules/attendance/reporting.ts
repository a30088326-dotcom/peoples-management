export interface AttendanceReportRow {
  id: string; date: string; employeeName?: string; employeeNo?: string; shiftName?: string;
  status?: string; inTime?: string; outTime?: string; totalHours?: string | number;
  overtimeHours?: string | number; isLate?: number | boolean;
}
export function filterAttendance(rows: AttendanceReportRow[], from: string, to: string, query: string, status: string) {
  const term = query.trim().toLowerCase();
  return rows.filter(row => {
    const date = String(row.date).slice(0, 10);
    return (!from || date >= from) && (!to || date <= to) &&
      (!status || (row.status || '').toLowerCase() === status.toLowerCase()) &&
      (!term || [row.employeeName, row.employeeNo, row.shiftName].some(value => value?.toLowerCase().includes(term)));
  });
}
export function attendanceCsv(rows: AttendanceReportRow[]) {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
  };
  const time = (value?: string) => value ? new Date(value).toLocaleTimeString('en-GB', {timeZone:'Asia/Colombo',hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '';
  return '\uFEFF' + [
    ['Date', 'Employee number', 'Employee', 'Shift', 'In (Asia/Colombo)', 'Out (Asia/Colombo)', 'Worked hours', 'Overtime hours', 'Status'],
    ...rows.map(row => [String(row.date).slice(0,10),row.employeeNo,row.employeeName,row.shiftName,time(row.inTime),time(row.outTime),Number(row.totalHours)||0,Number(row.overtimeHours)||0,row.status]),
  ].map(row => row.map(cell).join(',')).join('\r\n');
}
