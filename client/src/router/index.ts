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
            name: 'Home',
            redirect: () => {
                const auth = useAuthStore()
                return auth.isAdmin ? '/fleet-command' : '/cockpit'
            },
            meta: { requiresAuth: true },
        },
        {
            path: '/fleet-command',
            name: 'FleetCommand',
            component: () => import('@/views/FleetCommandView.vue'),
            meta: { requiresAuth: true, role: 'ADMIN' },
        },
        {
            path: '/cockpit',
            name: 'Cockpit',
            component: () => import('@/views/CockpitView.vue'),
            meta: { requiresAuth: true, role: 'DRIVER' },
        },
        {
            path: '/trips/:vehicleCode',
            name: 'TripLog',
            component: () => import('@/views/TripLogView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/trips/:vehicleCode/:tripId/result',
            name: 'TripResult',
            component: () => import('@/views/TripResultView.vue'),
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

// Navigation guard: auth + role enforcement
router.beforeEach((to) => {
    const auth = useAuthStore()

    // Redirect unauthenticated users to login
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        return { name: 'Login', query: { redirect: to.fullPath } }
    }

    // Redirect authenticated users away from login
    if (to.name === 'Login' && auth.isAuthenticated) {
        return auth.homeRoute
    }

    // Role-based access control
    if (to.meta.role && auth.role !== to.meta.role) {
        return auth.homeRoute
    }
})

export default router
