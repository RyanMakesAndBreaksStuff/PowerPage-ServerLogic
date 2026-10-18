export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const satisfies readonly HttpMethod[];
export type HandlerFunction = 'get' | 'post' | 'put' | 'patch' | 'del';
export const METHOD_FUNCTION = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'del',
} as const satisfies Record<HttpMethod, HandlerFunction>;
export type ClientLanguage = 'fetch' | 'jquery' | 'liquid';
export type View = 'starter' | 'objects' | 'inspector';
