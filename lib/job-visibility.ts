export function hideCompanyNames<T extends {company_name?: string}>(jobs: T[]): T[] {
  return jobs.map(job => ({...job, company_name: ''}));
}
