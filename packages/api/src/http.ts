import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: body === undefined ? '' : JSON.stringify(body),
  };
}

export function parseJsonBody(event: APIGatewayProxyEventV2): unknown {
  if (!event.body) {
    throw new HttpError(400, 'Request body is required');
  }
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

/** Wraps a Lambda handler with consistent JSON error responses. */
export function withErrorHandling(handler: Handler): Handler {
  return async (event) => {
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse(400, { message: 'Validation failed', issues: error.issues });
      }
      if (error instanceof HttpError) {
        return jsonResponse(error.statusCode, { message: error.message });
      }
      console.error(error);
      return jsonResponse(500, { message: 'Internal server error' });
    }
  };
}
