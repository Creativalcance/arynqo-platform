type LocatedJob = { location: string | null; country_code: string | null };
// Keep the stored location intact; normalize only comparisons and option values.
export const locationKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
export function matchesJobLocation(job: LocatedJob, country: string, location: string) {
  return (!country || job.country_code === country) && (!location || locationKey(job.location || "") === locationKey(location));
}
export function jobLocations(jobs: LocatedJob[], country: string, locale: string) {
  const options = new Map<string, string>();
  for (const job of jobs) {
    if (!matchesJobLocation(job, country, "")) continue;
    const label = job.location?.trim().replace(/\s+/g, " ");
    if (label && !options.has(locationKey(label))) options.set(locationKey(label), label);
  }
  return Array.from(options, ([value, label]) => ({ value, label })).sort((a,b) => a.label.localeCompare(b.label, locale));
}
