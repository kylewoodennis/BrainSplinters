import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;

function getVerifier() {
  if (!verifier) {
    const userPoolId = process.env.USER_POOL_ID;
    const clientId = process.env.USER_POOL_CLIENT_ID;
    if (!userPoolId || !clientId) {
      throw new Error('USER_POOL_ID and USER_POOL_CLIENT_ID environment variables are required');
    }
    verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId,
    });
  }
  return verifier;
}

/**
 * Public GET routes are not protected by an API Gateway authorizer (so anonymous
 * visitors can read published content), but they return draft content too when
 * the caller presents a valid Cognito ID token for our single admin user pool.
 * Any missing/invalid/expired token is treated as "anonymous" rather than an error.
 */
export async function isAuthenticatedAdminRequest(
  event: APIGatewayProxyEventV2,
): Promise<boolean> {
  const header = event.headers?.authorization ?? event.headers?.Authorization;
  if (!header?.startsWith('Bearer ')) return false;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return false;
  try {
    await getVerifier().verify(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * For routes protected by the API Gateway JWT authorizer, reads the caller's
 * identity out of the claims API Gateway already verified, for use as `createdBy`.
 */
export function getCallerIdentity(event: APIGatewayProxyEventV2): string {
  const claims = (
    event.requestContext as unknown as {
      authorizer?: { jwt?: { claims?: Record<string, string> } };
    }
  ).authorizer?.jwt?.claims;
  return claims?.email ?? claims?.['cognito:username'] ?? claims?.sub ?? 'admin';
}
