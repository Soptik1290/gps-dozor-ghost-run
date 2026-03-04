import { useAuthStore } from '@/stores/authStore'

const API_BASE = '/api/v1'

/**
 * Fetch wrapper for the legacy GPS Dozor API (Basic Auth).
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

/**
 * Fetch wrapper for the NestJS backend API (Bearer JWT).
 */
export async function nestFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const auth = useAuthStore()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    }

    if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`
    }

    const response = await fetch(`http://localhost:3000${endpoint}`, {
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
