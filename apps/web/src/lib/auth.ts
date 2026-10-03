import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const REGION = import.meta.env.VITE_AWS_REGION ?? 'us-east-1';
const CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID ?? '';
const SESSION_STORAGE_KEY = 'brainsplinters.auth';

const client = new CognitoIdentityProviderClient({ region: REGION });

export type AuthSession = {
  idToken: string;
  accessToken: string;
  expiresAt: number;
};

export class NewPasswordRequiredError extends Error {
  constructor(
    public session: string,
    public email: string,
  ) {
    super('A new password is required for this account.');
  }
}

export function getStoredSession(): AuthSession | null {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.expiresAt || session.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function storeSession(session: AuthSession): AuthSession {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

function toSession(authResult: {
  IdToken?: string;
  AccessToken?: string;
  ExpiresIn?: number;
}): AuthSession {
  if (!authResult.IdToken || !authResult.AccessToken || !authResult.ExpiresIn) {
    throw new Error('Sign-in did not return the expected tokens.');
  }
  return {
    idToken: authResult.IdToken,
    accessToken: authResult.AccessToken,
    expiresAt: Date.now() + authResult.ExpiresIn * 1000,
  };
}

/** Signs in the single administrator account. Throws NewPasswordRequiredError on first login. */
export async function signIn(email: string, password: string): Promise<AuthSession> {
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );

  if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    throw new NewPasswordRequiredError(result.Session ?? '', email);
  }
  if (!result.AuthenticationResult) {
    throw new Error('Sign-in failed: no authentication result returned.');
  }
  return storeSession(toSession(result.AuthenticationResult));
}

/** Completes the forced password-change challenge Cognito issues on first login. */
export async function completeNewPassword(
  email: string,
  newPassword: string,
  challengeSession: string,
): Promise<AuthSession> {
  const result = await client.send(
    new RespondToAuthChallengeCommand({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ClientId: CLIENT_ID,
      Session: challengeSession,
      ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
    }),
  );
  if (!result.AuthenticationResult) {
    throw new Error('Could not complete sign-in after setting a new password.');
  }
  return storeSession(toSession(result.AuthenticationResult));
}

export function signOut(): void {
  clearSession();
}
