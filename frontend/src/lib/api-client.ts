// VITE_API_BASE_URL is baked in at build time. Local development falls back to
// the local FastAPI server; production builds must set it (for example, the
// deployed API's https URL) and never inherit a localhost address.
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

if (!configuredApiBaseUrl && !import.meta.env.DEV) {
  console.error('VITE_API_BASE_URL is not set. API requests will fail in this build.')
}

export const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:8000' : '')).replace(
  /\/$/,
  ''
)

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { body, headers, ...rest } = options
  const isFormData = body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: isFormData
      ? headers
      : {
          'Content-Type': 'application/json',
          ...headers,
        },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })

  if (!response.ok) {
    let detail: string | undefined
    try {
      const errorBody = await response.json()
      detail = typeof errorBody?.detail === 'string' ? errorBody.detail : undefined
    } catch {
      // response had no JSON body
    }
    throw new ApiError(response.status, detail ?? `Request to ${path} failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

/**
 * Turns any thrown value into a sentence a person can act on.
 * A `fetch` rejection (backend down, CORS, DNS) surfaces as a TypeError, so it
 * gets its own message instead of the generic fallback.
 */
export function describeError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof TypeError) {
    return 'Cannot reach the ClausePilot API. Check that the backend is running.'
  }
  return fallback
}

export const apiClient = {
  get: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>(path, { ...options, method: 'GET' }),
  post: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>(path, { ...options, method: 'POST', body }),
}
