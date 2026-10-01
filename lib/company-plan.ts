// End the launch offer here when paid plans are introduced.
// This grants features, never candidate identity or consent.
export const companyLaunchOfferActive = true;

export function isPremiumCompany(plan?: string | null) {
  return companyLaunchOfferActive || plan === "premium";
}
