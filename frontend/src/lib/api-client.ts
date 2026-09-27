const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

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

export const apiClient = {
  get: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>(path, { ...options, method: 'GET' }),
  post: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>(path, { ...options, method: 'POST', body }),
}
