// Centralized Spotter API configuration
// Note: Lovable does not support VITE_* env vars. Keep base URL here.

export const SPOTTER_API_BASE_URL = 'https://api.exactspotter.com/v3';

export const spotterEndpoints = {
  leads: `${SPOTTER_API_BASE_URL}/Leads`,
  leadsAdd: `${SPOTTER_API_BASE_URL}/LeadsAdd`,
  personsAdd: `${SPOTTER_API_BASE_URL}/personsAdd`,
};

export const buildLeadFilterUrl = (leadName: string) =>
  `${spotterEndpoints.leads}?$filter=${encodeURIComponent(`lead eq '${leadName}'`)}`;
