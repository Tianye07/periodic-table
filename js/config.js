// Fill in these two values after you create the Google Cloud project and the Sheet.
// See README.md for the step-by-step.

export const CONFIG = {
  // OAuth 2.0 "Web application" client ID from Google Cloud Console.
  GOOGLE_CLIENT_ID: '975019670427-i3ldscra3dpbhpegaormp4ksuj2bsv95.apps.googleusercontent.com',

  // The long id in the Sheet URL: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
  SHEET_ID: '18bl4CD4gvnTDTni-4c3tt7yTaf0_4GCagv_g9_3Ag40',

  // A1 range, header row included. Without a sheet name this reads the first tab.
  SHEET_RANGE: 'A1:F',
};

export const isConfigured = () =>
  !CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_') && !CONFIG.SHEET_ID.startsWith('YOUR_');
