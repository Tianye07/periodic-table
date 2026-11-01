// Google Identity Services (token model). Gives us an access token that can read the Sheet.

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
].join(' ');

function waitForGoogle(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.oauth2) return resolve(window.google.accounts.oauth2);
      if (Date.now() - started > timeoutMs) {
        return reject(new Error('Google sign-in script failed to load. Check your connection or ad blocker.'));
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

/**
 * Returns { signIn(), signOut() }.
 * signIn() resolves with an access token string and rejects with an Error on failure or cancel.
 */
export async function createAuth(clientId) {
  const oauth2 = await waitForGoogle();
  let pending = null;
  let currentToken = null;

  const client = oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response) => {
      const p = pending;
      pending = null;
      if (!p) return;
      if (response.error || !response.access_token) {
        p.reject(new Error(response.error_description || response.error || 'Sign-in failed'));
        return;
      }
      if (!oauth2.hasGrantedAllScopes(response, 'https://www.googleapis.com/auth/spreadsheets.readonly')) {
        p.reject(new Error('Please allow access to Google Sheets so the data can be loaded.'));
        return;
      }
      currentToken = response.access_token;
      p.resolve(currentToken);
    },
    error_callback: (err) => {
      const p = pending;
      pending = null;
      p?.reject(new Error(err?.type === 'popup_closed' ? 'Sign-in was cancelled.' : err?.message || 'Sign-in failed'));
    },
  });

  return {
    signIn() {
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        client.requestAccessToken({ prompt: currentToken ? '' : 'select_account' });
      });
    },
    signOut() {
      if (currentToken) oauth2.revoke(currentToken, () => {});
      currentToken = null;
    },
  };
}
