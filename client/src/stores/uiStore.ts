import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
    const isSidebarOpen = ref(false)
    const isHudExpanded = ref(true)
    const activeTab = ref<'crew' | 'fleet'>('fleet')

    // Weather-triggered UI effects
    const weatherOverlay = ref<'none' | 'rain' | 'ice' | 'storm'>('none')

    function toggleSidebar() {
        isSidebarOpen.value = !isSidebarOpen.value
    }

    function setWeatherOverlay(status: 'none' | 'rain' | 'ice' | 'storm') {
        weatherOverlay.value = status
    }

    return {
        isSidebarOpen,
        isHudExpanded,
        activeTab,
        weatherOverlay,
        toggleSidebar,
        setWeatherOverlay,
    }
})
