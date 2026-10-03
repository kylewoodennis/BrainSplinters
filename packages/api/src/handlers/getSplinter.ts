import { HttpError, withErrorHandling, jsonResponse } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter } from '../dynamo/repository.js';
import { isAuthenticatedAdminRequest } from '../auth/verifyJwt.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  if (!splinterId) throw new HttpError(400, 'splinterId is required');

  const isAdmin = await isAuthenticatedAdminRequest(event);
  const splinter = await getSplinter(getDocClient(), getTableName(), splinterId);
  if (!splinter || (!isAdmin && splinter.status !== 'published')) {
    throw new HttpError(404, 'Splinter not found');
  }
  return jsonResponse(200, splinter);
});
