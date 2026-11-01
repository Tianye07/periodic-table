import { CONFIG, isConfigured } from './config.js';
import { createAuth } from './auth.js';
import { fetchPeople, fetchProfile, TIERS } from './sheet.js';
import { createViewer } from './viewer.js';

const $ = (id) => document.getElementById(id);
const loginView = $('login');
const appView = $('app');
const signInBtn = $('sign-in');
const loginMsg = $('login-message');
const userLabel = $('user');
const container = $('container');

let auth = null;
let viewer = null;

function setMessage(text, isError = true) {
  loginMsg.textContent = text;
  loginMsg.classList.toggle('error', isError);
}

function setBusy(busy, label) {
  signInBtn.disabled = busy;
  signInBtn.querySelector('.label').textContent = label ?? 'Sign in with Google';
}

function buildLegend() {
  const legend = $('legend');
  legend.replaceChildren();
  for (const tier of Object.values(TIERS)) {
    const item = document.createElement('span');
    item.className = 'legend-item';
    const swatch = document.createElement('i');
    swatch.style.background = tier.color;
    item.append(swatch, tier.label);
    legend.appendChild(item);
  }
}

function showLogin(message) {
  viewer?.destroy();
  viewer = null;
  appView.hidden = true;
  loginView.hidden = false;
  setBusy(false);
  setMessage(message ?? '', Boolean(message));
}

function selectLayout(name) {
  document.querySelectorAll('#menu button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === name);
  });
  viewer?.show(name);
}

async function handleSignIn() {
  setMessage('');
  try {
    setBusy(true, 'Signing in...');
    auth ??= await createAuth(CONFIG.GOOGLE_CLIENT_ID);
    const token = await auth.signIn();

    setBusy(true, 'Loading data...');
    const [people, profile] = await Promise.all([
      fetchPeople({ sheetId: CONFIG.SHEET_ID, range: CONFIG.SHEET_RANGE }, token),
      fetchProfile(token).catch(() => null),
    ]);
    if (people.length === 0) throw new Error('The Sheet has no data rows.');

    userLabel.textContent = profile?.email ?? '';
    loginView.hidden = true;
    appView.hidden = false;
    buildLegend();
    viewer = createViewer(container, people);
    selectLayout('table');
  } catch (err) {
    const msg =
      err.status === 403
        ? 'Access denied. Make sure this Google account has access to the Sheet.'
        : err.status === 404
          ? 'Sheet not found. Check SHEET_ID in js/config.js.'
          : err.message || 'Something went wrong.';
    showLogin(msg);
  }
}

signInBtn.addEventListener('click', handleSignIn);
$('menu').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-layout]');
  if (btn) selectLayout(btn.dataset.layout);
});
$('sign-out').addEventListener('click', () => {
  auth?.signOut();
  showLogin();
});

if (!isConfigured()) {
  signInBtn.disabled = true;
  setMessage('Set GOOGLE_CLIENT_ID and SHEET_ID in js/config.js first (see README).');
}
