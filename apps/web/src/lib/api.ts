import type {
  CreatePostInput,
  CreateSplinterInput,
  Post,
  PresignUploadInput,
  PresignUploadResult,
  Splinter,
  UpdatePostInput,
  UpdateSplinterInput,
} from '@brainsplinters/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & { token?: string };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new ApiError(res.status, body.message ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const encode = (value: string) => encodeURIComponent(value);

export const api = {
  listSplinters: (token?: string) => request<Splinter[]>('/splinters', { token }),
  getSplinter: (splinterId: string, token?: string) =>
    request<Splinter>(`/splinters/${encode(splinterId)}`, { token }),
  listPosts: (splinterId: string, token?: string) =>
    request<Post[]>(`/splinters/${encode(splinterId)}/posts`, { token }),
  getPost: (splinterId: string, postId: string, token?: string) =>
    request<Post>(`/splinters/${encode(splinterId)}/posts/${encode(postId)}`, { token }),

  createSplinter: (input: CreateSplinterInput, token: string) =>
    request<Splinter>('/splinters', { method: 'POST', body: JSON.stringify(input), token }),
  updateSplinter: (splinterId: string, input: UpdateSplinterInput, token: string) =>
    request<Splinter>(`/splinters/${encode(splinterId)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
      token,
    }),
  deleteSplinter: (splinterId: string, token: string) =>
    request<void>(`/splinters/${encode(splinterId)}`, { method: 'DELETE', token }),

  createPost: (splinterId: string, input: CreatePostInput, token: string) =>
    request<Post>(`/splinters/${encode(splinterId)}/posts`, {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),
  updatePost: (splinterId: string, postId: string, input: UpdatePostInput, token: string) =>
    request<Post>(`/splinters/${encode(splinterId)}/posts/${encode(postId)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
      token,
    }),
  deletePost: (splinterId: string, postId: string, token: string) =>
    request<void>(`/splinters/${encode(splinterId)}/posts/${encode(postId)}`, {
      method: 'DELETE',
      token,
    }),

  presignUpload: (input: PresignUploadInput, token: string) =>
    request<PresignUploadResult>('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),
};
