import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: () => import('@/views/LoginView.vue'),
            meta: { requiresAuth: false },
        },
        {
            path: '/',
            name: 'Dashboard',
            component: () => import('@/views/DashboardView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/trips/:vehicleCode',
            name: 'TripLog',
            component: () => import('@/views/TripLogView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/ghost-run/:vehicleCode',
            name: 'GhostRun',
            component: () => import('@/views/GhostRunView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/settings',
            name: 'Settings',
            component: () => import('@/views/SettingsView.vue'),
            meta: { requiresAuth: true },
        },
    ],
})

// Navigation guard: redirect to login if not authenticated
router.beforeEach((to) => {
    const auth = useAuthStore()
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        return { name: 'Login', query: { redirect: to.fullPath } }
    }
    if (to.name === 'Login' && auth.isAuthenticated) {
        return { name: 'Dashboard' }
    }
})

export default router
