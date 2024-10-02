export function generateApiClient(baseUrl: string): string {
  return `
const API_BASE_URL = '/rest'

type RequiredHeaders = {
    consumer: string
}

export type RequestOptions = {
    params?: Record<string, string>
    headers: RequiredHeaders & Record<string, string>
    body?: any
}

export type ApiResponse<T> = {
    data: T | null
    status: number
    headers: Headers
}

// shared request function
async function request<T>(
    method: string,
    endpoint: string,
    options: RequestOptions
): Promise<ApiResponse<T>> {
    const url = new URL(API_BASE_URL + endpoint, window.location.origin)

    if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
            url.searchParams.append(key, value)
        })
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        correlationid: uuid(),
        ...options.headers,
    }

    const config: RequestInit = {
        method,
        headers,
    }

    config.body = prepBody(options)

    const response = await fetch(url.toString(), config)

    const apiResponse: ApiResponse<T> = {
        data: null,
        status: response.status,
        headers: response.headers,
    }

    if (response.status !== 204) {
        apiResponse.data = await response.json()
    }

    return apiResponse
}

// exported interface
function get<T>(
    endpoint: string,
    options: RequestOptions
): Promise<ApiResponse<T>> {
    return request<T>('GET', endpoint, options)
}

function post<T>(
    endpoint: string,
    body: any,
    options: RequestOptions
): Promise<ApiResponse<T>> {
    return request<T>('POST', endpoint, { ...options, body })
}

function put<T>(
    endpoint: string,
    body: any,
    options: RequestOptions
): Promise<ApiResponse<T>> {
    return request<T>('PUT', endpoint, { ...options, body })
}

function patch<T>(
    endpoint: string,
    body: any,
    options: RequestOptions
): Promise<ApiResponse<T>> {
    return request<T>('PATCH', endpoint, { ...options, body })
}

function del<T>(
    endpoint: string,
    options: RequestOptions
): Promise<ApiResponse<T>> {
    return request<T>('DELETE', endpoint, options)
}

export default { get, post, put, patch, del }

/***
 * A function to generate uuid
 *  for less package dependecies
 *  */
function uuid(): string {
    return crypto.randomUUID()
}

/**
 * Returns stringified body if Content-Type is json
 * else it just returns the original body
 */
function prepBody(options: RequestOptions) {
    if (!options.body) return

    if (options?.headers?.['Content-Type'] === 'application/json') {
        return JSON.stringify(options.body)
    }
    return options.body
}`;
}
