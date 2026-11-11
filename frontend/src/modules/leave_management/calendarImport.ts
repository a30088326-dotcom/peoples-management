export function holidayDates(text: string, year: number) {
  const dates = new Set<string>();
  for (const value of text.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/g) || []) {
    const parts=value.split(/[-/]/);
    const date=parts[0].length===4 ? value : value.includes('/') ? `${parts[2]}-${parts[0]}-${parts[1]}` : `${parts[2]}-${parts[1]}-${parts[0]}`;
    const parsed=new Date(date+'T12:00:00Z');
    if(date.startsWith(`${year}-`)&&!Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===date)dates.add(date);
  }
  return [...dates];
}
