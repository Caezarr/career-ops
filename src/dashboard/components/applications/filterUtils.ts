import type {
  Application,
  ApplicationsSort,
  ApplicationsTab,
  Job,
} from '../../store';

/** All role families the dropdown can show. Order = display order
 *  when no apps exist for a family yet. Pinned at the top of the
 *  module so TabFilters and filterUtils stay aligned. */
export const ROLE_FAMILIES = [
  'Finance',
  'Banking',
  'Consulting',
  'Strategy',
  'Product',
  'Engineering',
  'Data',
  'Design',
  'Sales',
  'Marketing',
  'Operations',
  'HR / People',
  'Legal',
] as const;

export type RoleFamily = (typeof ROLE_FAMILIES)[number];

/** Heuristically classify a job's role text into one of the families
 *  above. Each branch checks both English and (where commonly used)
 *  French keywords because the user's pipeline mixes both. The
 *  ordering matters — more specific families (Banking, Consulting)
 *  are checked before more general ones (Finance, Strategy) so
 *  "Investment Banking Analyst" lands in Banking, not Finance. */
export function familyFor(role: string): RoleFamily | null {
  const r = role.toLowerCase();
  // Banking is a specialisation of Finance; check it first so
  // "investment banking" / "IBD" don't get swallowed by Finance.
  if (/(\bibd\b|investment bank|m&a|leverag|debt capital|equity capital|\bbanker?\b|\bbanque\b)/i.test(r))
    return 'Banking';
  // Consulting / Conseil — strategy consulting firms are checked
  // explicitly so "Bain Consultant" doesn't get classified as
  // Strategy.
  if (/(consult|conseil|advisor|advisory|\bbcg\b|\bmckinsey\b|\bbain\b|kearney|oliver wyman|roland berger)/i.test(r))
    return 'Consulting';
  if (/(\bpe\b|private equity|venture capital|\bvc\b|finance|trading|asset manag|wealth|hedge fund|tresorerie|tr[ée]sorerie)/i.test(r))
    return 'Finance';
  if (/(strategy|strat[ée]gie|\bstrat\b|chief of staff)/i.test(r))
    return 'Strategy';
  if (/(\bpm\b|product manager|product owner|\bpo\b|product designer)/i.test(r))
    return 'Product';
  if (/(engineer|developer|software|\bswe\b|backend|frontend|fullstack|d[ée]veloppeur|infra|sre|devops|architect)/i.test(r))
    return 'Engineering';
  if (/(\bdata\b|analyst|analytics|machine learning|\bml\b|\bai\b|scientist)/i.test(r))
    return 'Data';
  if (/(\bdesign\b|\bux\b|\bui\b|brand|graphic|illustrat)/i.test(r))
    return 'Design';
  if (/(sales|account executive|\bae\b|account manager|business development|\bbd\b|customer success|\bcs\b)/i.test(r))
    return 'Sales';
  if (/(market|growth|content|\bcrm\b|\bseo\b|brand manager|communicat)/i.test(r))
    return 'Marketing';
  if (/(\bops\b|operations|operation manager|coo\b|chief operating)/i.test(r))
    return 'Operations';
  if (/(\bhr\b|human resources|people|talent|recruit|rh\b|ressources humaines)/i.test(r))
    return 'HR / People';
  if (/(legal|counsel|\bgc\b|compliance|paralegal|juridique|avocat)/i.test(r))
    return 'Legal';
  return null;
}

export function filterAndSortApplications(
  applications: Application[],
  jobs: Job[],
  tab: ApplicationsTab,
  role: string,
  sort: ApplicationsSort,
): Application[] {
  const byJob = new Map(jobs.map((j) => [j.id, j]));

  const visible = applications.filter((a) => {
    // Tab filter.
    if (tab === 'all' && a.archived) return false;
    if (tab === 'active') {
      if (a.archived) return false;
      if (!['sourced', 'applied', 'phone_screen'].includes(a.stage)) return false;
    }
    if (tab === 'interviews') {
      if (a.archived) return false;
      if (!['interview', 'offer'].includes(a.stage)) return false;
    }
    if (tab === 'archived') {
      if (!a.archived && a.stage !== 'rejected') return false;
    }
    // Role filter — match against the inferred family rather than a
    // raw substring so "Consulting" matches "BCG Consultant",
    // "McKinsey Conseil", "Strategy Consulting Internship", etc.
    if (role && role !== 'All roles') {
      const job = byJob.get(a.jobId);
      const fam = familyFor(job?.role ?? '');
      if (fam !== role) return false;
    }
    return true;
  });

  return visible.slice().sort((a, b) => {
    // "Last activity" uses the runtime lastActivityAt timestamp when
    // present, falling back to appliedAt for older seeded apps that
    // pre-date the field.
    if (sort === 'recent') {
      const aTs = (a as { lastActivityAt?: number }).lastActivityAt ?? a.appliedAt;
      const bTs = (b as { lastActivityAt?: number }).lastActivityAt ?? b.appliedAt;
      return bTs - aTs;
    }
    // "Date applied" sorts strictly by the original application date.
    if (sort === 'applied') return b.appliedAt - a.appliedAt;
    if (sort === 'match') return b.match - a.match;
    if (sort === 'company') {
      const ja = byJob.get(a.jobId)?.company ?? '';
      const jb = byJob.get(b.jobId)?.company ?? '';
      return ja.localeCompare(jb);
    }
    if (sort === 'stage') return a.stage.localeCompare(b.stage);
    return 0;
  });
}
