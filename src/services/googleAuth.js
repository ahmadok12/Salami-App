const SCOPE = 'https://www.googleapis.com/auth/drive.file openid email profile';

export function isGoogleConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

let tokenClient = null;
let cachedToken = null;
let tokenExpiresAt = 0;

export function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }
  return null;
}

export function clearSession() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

/**
 * Prompts Google OAuth 2.0 consent using Google Identity Services (GIS) with drive.file scope.
 */
export function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error('Google Cloud Client ID not configured in .env yet.'));
      return;
    }
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      reject(new Error('Google Identity script not loaded (are you offline?).'));
      return;
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: async (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        cachedToken = resp.access_token;
        tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3500) * 1000;

        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${cachedToken}` }
          });
          const profile = profileRes.ok ? await profileRes.json() : {};
          resolve({
            accessToken: cachedToken,
            user: {
              name: profile.name || 'Google Collector',
              email: profile.email || '',
              picture: profile.picture || ''
            }
          });
        } catch {
          resolve({
            accessToken: cachedToken,
            user: { name: 'Google Collector', email: '', picture: '' }
          });
        }
      }
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
}
