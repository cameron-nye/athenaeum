import { OAuth2Client, Credentials } from 'google-auth-library';

/**
 * Google OAuth2 configuration from environment variables
 */
function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI'
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Creates a new OAuth2 client instance with the configured credentials.
 * Use this for initiating OAuth flows or when you don't have tokens yet.
 */
export function createOAuth2Client(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/**
 * Creates an OAuth2 client with existing tokens.
 * Automatically refreshes expired access tokens using the refresh token.
 *
 * @param tokens - The OAuth2 credentials including access_token and refresh_token
 * @returns OAuth2Client configured with the tokens
 */
export function createOAuth2ClientWithTokens(tokens: Credentials): OAuth2Client {
  const client = createOAuth2Client();
  client.setCredentials(tokens);
  return client;
}

/**
 * Generates the Google OAuth2 authorization URL.
 *
 * @param state - CSRF protection state parameter
 * @param scopes - OAuth scopes to request (defaults to calendar.readonly)
 * @returns The authorization URL to redirect the user to
 */
export function generateAuthUrl(state: string, scopes?: string[]): string {
  const client = createOAuth2Client();

  const defaultScopes = ['https://www.googleapis.com/auth/calendar.readonly'];

  return client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: scopes ?? defaultScopes,
    state,
    prompt: 'consent', // Force consent to get refresh token every time
  });
}

/**
 * Exchanges an authorization code for OAuth2 tokens.
 *
 * @param code - The authorization code from the OAuth callback
 * @returns The OAuth2 credentials including access_token and refresh_token
 */
export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Refreshes an expired access token using the refresh token.
 *
 * @param refreshToken - The refresh token to use
 * @returns New credentials with a fresh access_token
 * @throws Error if refresh token is invalid or revoked
 */
export async function refreshAccessToken(refreshToken: string): Promise<Credentials> {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

/**
 * Validates that tokens are present and returns whether the access token is expired.
 *
 * @param tokens - The OAuth2 credentials to check
 * @returns Object with isExpired boolean and whether refresh is possible
 */
export function checkTokenStatus(tokens: Credentials): {
  isExpired: boolean;
  canRefresh: boolean;
} {
  const hasRefreshToken = !!tokens.refresh_token;
  const expiryDate = tokens.expiry_date;

  // If no expiry date, assume expired (conservative approach)
  if (!expiryDate) {
    return { isExpired: true, canRefresh: hasRefreshToken };
  }

  // Add 5-minute buffer to avoid edge cases
  const bufferMs = 5 * 60 * 1000;
  const isExpired = Date.now() >= expiryDate - bufferMs;

  return { isExpired, canRefresh: hasRefreshToken };
}

/**
 * Gets a valid OAuth2 client, automatically refreshing tokens if needed.
 * This is the primary function to use when making Google API calls.
 *
 * @param tokens - The stored OAuth2 credentials
 * @param onTokenRefresh - Optional callback when tokens are refreshed (to update storage)
 * @returns OAuth2Client with valid credentials
 * @throws Error if tokens cannot be refreshed
 */
export async function getValidOAuth2Client(
  tokens: Credentials,
  onTokenRefresh?: (newTokens: Credentials) => Promise<void>
): Promise<OAuth2Client> {
  const { isExpired, canRefresh } = checkTokenStatus(tokens);

  if (!isExpired) {
    return createOAuth2ClientWithTokens(tokens);
  }

  if (!canRefresh) {
    throw new Error('Access token expired and no refresh token available');
  }

  // Refresh the tokens
  const newTokens = await refreshAccessToken(tokens.refresh_token!);

  // Preserve the original refresh token if not returned in refresh response
  const mergedTokens: Credentials = {
    ...newTokens,
    refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
  };

  // Notify caller of new tokens
  if (onTokenRefresh) {
    await onTokenRefresh(mergedTokens);
  }

  return createOAuth2ClientWithTokens(mergedTokens);
}
