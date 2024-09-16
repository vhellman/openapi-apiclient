export function generateApiClientCode(baseUrl: string): string {
    return `
        const API_BASE_URL = '${baseUrl}';
        
        export type RequestOptions = {
            params?: Record<string, string>;
            headers?: Record<string, string>;
            body?: any;
        };
        
        export type ApiResponse<T> = {
            data: T | null;
            status: number;
            headers: Headers;
        };
        
        const apiClient = {
            async request<T>(method: string, endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
            const url = new URL(API_BASE_URL + endpoint, window.location.origin);
            
            if (options.params) {
                Object.entries(options.params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
                });
            }
        
            const config: RequestInit = {
                method,
                headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                },
            };
        
            if (options.body) {
                config.body = JSON.stringify(options.body);
            }
        
            const response = await fetch(url.toString(), config);
        
            const apiResponse: ApiResponse<T> = {
                data: null,
                status: response.status,
                headers: response.headers,
            };
        
            if (response.status !== 204) {
                apiResponse.data = await response.json();
            }
        
            return apiResponse;
            },
        
            get<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
            return this.request<T>('GET', endpoint, options);
            },
        
            post<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
            return this.request<T>('POST', endpoint, { ...options, body });
            },
        
            put<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
            return this.request<T>('PUT', endpoint, { ...options, body });
            },
        
            patch<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
            return this.request<T>('PATCH', endpoint, { ...options, body });
            },
        
            delete<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
            return this.request<T>('DELETE', endpoint, options);
            },
        };
        
        export default apiClient;
        `;
  }