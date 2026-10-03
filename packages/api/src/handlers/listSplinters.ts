import { withErrorHandling, jsonResponse } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { listSplinters } from '../dynamo/repository.js';
import { isAuthenticatedAdminRequest } from '../auth/verifyJwt.js';

export const handler = withErrorHandling(async (event) => {
  const isAdmin = await isAuthenticatedAdminRequest(event);
  const splinters = await listSplinters(getDocClient(), getTableName());
  const visible = isAdmin ? splinters : splinters.filter((s) => s.status === 'published');
  return jsonResponse(200, visible);
});
