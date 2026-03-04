import { useAuthStore } from '@/stores/authStore'

const API_BASE = '/api/v1'

/**
 * Fetch wrapper that injects Basic Auth from the auth store.
 * In dev mode, Vite proxy handles auth. In production, we use stored credentials.
 */
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const auth = useAuthStore()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    }

    // In production, inject Basic Auth from store
    if (auth.credentials) {
        headers['Authorization'] = `Basic ${auth.credentials}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        if (response.status === 401) {
            auth.logout()
            throw new Error('AUTH_EXPIRED')
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
}
