import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()

    // Base64-encoded "login:password" for Basic Auth
    const credentials = ref<string | null>(
        localStorage.getItem('ghost_run_credentials')
    )
    const username = ref<string>(
        localStorage.getItem('ghost_run_username') || ''
    )

    const isAuthenticated = computed(() => !!credentials.value)

    function login(user: string, password: string) {
        const encoded = btoa(`${user}:${password}`)
        credentials.value = encoded
        username.value = user
        localStorage.setItem('ghost_run_credentials', encoded)
        localStorage.setItem('ghost_run_username', user)
    }

    function logout() {
        credentials.value = null
        username.value = ''
        localStorage.removeItem('ghost_run_credentials')
        localStorage.removeItem('ghost_run_username')
        router.push({ name: 'Login' })
    }

    return {
        credentials,
        username,
        isAuthenticated,
        login,
        logout,
    }
})
