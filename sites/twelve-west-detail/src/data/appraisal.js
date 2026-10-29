// The appraisal numbers. The agency total is added up from the lines.
// yourPrice is Brice's recommendation and is not confirmed yet.
export const agencyLines = [
  { label: 'Mobile website with your photos, logo and full price list', amount: 3000 },
  { label: 'Vehicle size picker that reprices every package', amount: 750 },
  { label: 'Quote builder with add ons and included items', amount: 1500 },
  { label: 'Booking requests sent to your phone and email', amount: 1500 },
  { label: 'Online deposits for ceramic coatings', amount: 1000 },
  { label: 'Recent work and interior galleries', amount: 500 },
  { label: 'Google basics and moving off the GoDaddy builder', amount: 500 },
];
export const agencyTotal = agencyLines.reduce((sum, l) => sum + l.amount, 0);
export const yourPrice = 2000;
export const priceNote = 'Local rate. You do the kind of work that should have a site to match, and I want to be the one who builds it.';
export const dated = 'October 2026';
