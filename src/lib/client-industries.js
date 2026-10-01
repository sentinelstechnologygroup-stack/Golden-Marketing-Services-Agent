export const clientIndustries = [
  ['real-estate', 'Real Estate'],
  ['mortgage-lending', 'Mortgage Lending'],
  ['roofing', 'Roofing'],
  ['medical', 'Medical / Healthcare'],
  ['dental', 'Dental'],
  ['hvac', 'HVAC'],
  ['plumbing', 'Plumbing'],
  ['electrical', 'Electrical'],
  ['home-services', 'Home Services'],
  ['home-improvement', 'Home Improvement / Remodeling'],
  ['insurance', 'Insurance'],
  ['legal', 'Legal Services'],
  ['automotive', 'Automotive'],
  ['financial-services', 'Financial Services'],
  ['professional-services', 'Professional Services'],
  ['business-services', 'Business Services'],
];

// Custom and historical industries remain in the canonical industry field.
// Opening a client never silently rewrites an existing classification.
export const industrySelection = value => !value ? '' : clientIndustries.some(([id]) => id === value) ? value : 'other';
export const industryLabel = value => clientIndustries.find(([id]) => id === value)?.[1] || value || 'Not entered';
