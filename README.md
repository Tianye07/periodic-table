# People Table (3D)

A Three.js CSS3D "periodic table" adapted to show people from a Google Sheet. It has Google sign-in, tiles coloured by net worth, and five layouts (Table 20x10, Sphere, double Helix, Grid 5x4x10, Pyramid (tetrahedron)).

Static site: no build step and no backend.

## 1. Google Sheet

1. Create a new Google Sheet, then **File > Import > Upload** and choose `data/people.csv` (a UTF-8 copy of the supplied CSV with the stray bytes and the padded `" Net Worth "` header cleaned up). Replace the current sheet.
2. **Share** the Sheet with `lisa@kasatria.com` (Viewer is enough).
3. Copy the Sheet id from the URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.

## 2. Google Cloud project (login + Sheets access)

1. [Google Cloud Console](https://console.cloud.google.com) > create a project.
2. **APIs & Services > Library** > enable **Google Sheets API**.
3. **OAuth consent screen** (Google Auth Platform) > External. Add the scope `.../auth/spreadsheets.readonly`.
   While the app is in *Testing*, add `lisa@kasatria.com` and yourself under **Test users**. Only test users can sign in until the app is published or verified.
4. **Credentials > Create credentials > OAuth client ID > Web application.**
   Under **Authorized JavaScript origins** add your deployed origin (for example `https://<user>.github.io`) and `http://localhost:8000` for local testing. No redirect URI is needed.
5. Copy the client ID.

## 3. Configure

Edit `js/config.js`:

```js
GOOGLE_CLIENT_ID: '1234-abc.apps.googleusercontent.com',
SHEET_ID: 'your-sheet-id',
SHEET_RANGE: 'A1:F',   // first tab, header row included
```

## 4. Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
node tests/check.mjs          # layout and parsing checks (Node 18+)
```

## 5. Deploy

Any static host works. For GitHub Pages: push this folder to a repo, then **Settings > Pages > Deploy from branch (main, /root)**. Add the resulting origin to the OAuth client's authorized JavaScript origins, then send that URL.

## How it maps to the brief

| Requirement | Where |
|---|---|
| Google login page (Image A) | `index.html`, `js/auth.js` (Google Identity Services) |
| Data from Google Sheet | `js/sheet.js` (Sheets API v4, using the signed-in user's token) |
| Tile content (Image B): country, age, photo, name, interest | `js/viewer.js`, `css/style.css` |
| Net worth colours: red < $100K, orange $100K to $200K, green > $200K | `tierFor()` in `js/sheet.js` |
| Table 20x10, Sphere, double Helix, Grid 5x4x10, Pyramid (tetrahedron) | `js/layouts.js` |

Notes
- Exactly $100,000 and exactly $200,000 count as orange (the brief doesn't say which way the boundaries go).
- Names and other cell values are inserted with `textContent` and photo URLs must be http(s), so a bad Sheet cell can't inject markup.
- The access token is kept in memory only. Reloading the page signs you out.
- The login page and tiles follow Images A and B. Colours are `#EF3022` (red), `#FDCA35` (orange) and `#3A9F48` (green), taken from the Image B swatches.
