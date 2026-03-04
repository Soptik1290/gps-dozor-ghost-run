import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export interface AssignedVehicle {
    id: number
    name: string
    plate: string
}

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()

    // JWT token
    const token = ref<string | null>(
        localStorage.getItem('ghost_run_token')
    )

    // User info
    const userId = ref<number | null>(
        JSON.parse(localStorage.getItem('ghost_run_userId') || 'null')
    )
    const username = ref<string>(
        localStorage.getItem('ghost_run_username') || ''
    )
    const role = ref<'ADMIN' | 'DRIVER' | null>(
        (localStorage.getItem('ghost_run_role') as 'ADMIN' | 'DRIVER') || null
    )
    const assignedVehicle = ref<AssignedVehicle | null>(
        JSON.parse(localStorage.getItem('ghost_run_vehicle') || 'null')
    )

    // Keep Basic Auth credentials for the external GPS Dozor API (legacy /api/v1 endpoints)
    const credentials = ref<string | null>(
        localStorage.getItem('ghost_run_credentials')
    )

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => role.value === 'ADMIN')
    const isDriver = computed(() => role.value === 'DRIVER')
    const homeRoute = computed(() => isAdmin.value ? '/fleet-command' : '/cockpit')

    async function login(user: string, password: string) {
        // Call NestJS JWT login
        const res = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || 'Invalid credentials')
        }

        const data = await res.json()

        // Store JWT
        token.value = data.access_token
        localStorage.setItem('ghost_run_token', data.access_token)

        // Store user info
        userId.value = data.user.id
        username.value = data.user.username
        role.value = data.user.role
        localStorage.setItem('ghost_run_userId', JSON.stringify(data.user.id))
        localStorage.setItem('ghost_run_username', data.user.username)
        localStorage.setItem('ghost_run_role', data.user.role)

        // Store assigned vehicle for drivers
        if (data.assignedVehicle) {
            assignedVehicle.value = {
                id: data.assignedVehicle.id,
                name: data.assignedVehicle.name,
                plate: data.assignedVehicle.plate,
            }
            localStorage.setItem('ghost_run_vehicle', JSON.stringify(assignedVehicle.value))
        } else {
            assignedVehicle.value = null
            localStorage.removeItem('ghost_run_vehicle')
        }

        // Also store Basic Auth credentials for legacy GPS Dozor API
        const encoded = btoa(`${user}:${password}`)
        credentials.value = encoded
        localStorage.setItem('ghost_run_credentials', encoded)

        return data
    }

    function logout() {
        token.value = null
        userId.value = null
        username.value = ''
        role.value = null
        assignedVehicle.value = null
        credentials.value = null

        localStorage.removeItem('ghost_run_token')
        localStorage.removeItem('ghost_run_userId')
        localStorage.removeItem('ghost_run_username')
        localStorage.removeItem('ghost_run_role')
        localStorage.removeItem('ghost_run_vehicle')
        localStorage.removeItem('ghost_run_credentials')

        router.push({ name: 'Login' })
    }

    return {
        token,
        userId,
        username,
        role,
        assignedVehicle,
        credentials,
        isAuthenticated,
        isAdmin,
        isDriver,
        homeRoute,
        login,
        logout,
    }
})
