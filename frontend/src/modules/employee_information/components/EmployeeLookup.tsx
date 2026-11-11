import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { usersApi, type MemberData } from '../../../lib/api/users';

export default function EmployeeLookup({ onSelect, disabled }: {
  onSelect: (employee: MemberData) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberData[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cached = useRef<MemberData[] | null>(null);
  const resultsId = useId();

  useEffect(() => {
    let active = true;
    const term = query.trim().toLowerCase();
    setResults([]);
    setError('');
    setLoading(false);
    if (term.length < 2) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        let people = cached.current;
        if (!people) {
          people = [];
          let page = 1, totalPages = 1;
          do {
            const response = await usersApi.list({ page, limit: 100 });
            if (!active) return;
            people.push(...response.data.data);
            totalPages = response.data.meta?.totalPages || 1;
            page++;
          } while (page <= totalPages);
          cached.current = people;
        }
        if (active) setResults(people.filter(person => [person.name, person.email,
          person.employee?.employeeNo, person.onboardingProfile?.firstName,
          person.onboardingProfile?.lastName].some(value => value?.toLowerCase().includes(term))));
      } catch {
        if (active) setError('Unable to search employees. Try again.');
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  return <div className="employee-lookup" role="search" aria-label="Find an employee"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label className="sr-only" htmlFor={resultsId + '-query'}>Search employees</label>
    <Search size={16} aria-hidden="true" className="employee-lookup-icon" />
    <input id={resultsId + '-query'} type="search" value={query} disabled={disabled}
      placeholder="Search employees…" autoComplete="off" aria-controls={resultsId}
      aria-expanded={open && query.trim().length >= 2}
      onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }}
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} />
    {open && query.trim().length >= 2 && <div id={resultsId} className="employee-lookup-results">
      {loading ? <p role="status">Searching employees…</p> : error ? <p role="alert">{error}</p> :
        results.length ? <ul aria-label="Employee search results">{results.map(person => <li key={person.id}>
          <button type="button" onClick={() => { onSelect(person); setOpen(false); setQuery(''); }}>
            <span className="font-semibold">{person.name || [person.onboardingProfile?.firstName, person.onboardingProfile?.lastName].filter(Boolean).join(' ') || person.email}</span>
            <span className="text-xs text-slate-500">{person.employee?.employeeNo || 'Onboarding'} · {person.email}</span>
          </button>
        </li>)}</ul> : <p>No employees found.</p>}
    </div>}
  </div>;
}
