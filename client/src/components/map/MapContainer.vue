<template>
  <div ref="containerEl" class="map-container w-full h-full relative" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, type PropType } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { ApiHistoryEntry, ApiEcoDrivingEvent } from '@/api/types'
import { EcoDrivingEventType, EventSeverity } from '@/api/types'

// ── Props ──
const props = defineProps({
  /** Position history for the "reality" (current) trail */
  realityPositions: {
    type: Array as PropType<ApiHistoryEntry[]>,
    default: () => [],
  },
  /** Position history for the "ghost" (reference) trail */
  ghostPositions: {
    type: Array as PropType<ApiHistoryEntry[]>,
    default: () => [],
  },
  /** Eco-driving events to render as markers */
  ecoEvents: {
    type: Array as PropType<ApiEcoDrivingEvent[]>,
    default: () => [],
  },
  /** Current Reality Position (for moving dot) */
  realityCurrentPosition: {
    type: Object as PropType<ApiHistoryEntry | null>,
    default: null
  },
  /** Current Ghost Position (for moving dot) */
  ghostCurrentPosition: {
    type: Object as PropType<ApiHistoryEntry | null>,
    default: null
  },
  /** Lock camera to reality marker */
  cameraFollowReality: {
    type: Boolean,
    default: false
  },
  /** Center the map on this lat/lng on first load */
  initialCenter: {
    type: Array as PropType<[number, number]>,
    default: () => [14.42, 50.08], // Prague
  },
  /** Initial zoom level */
  initialZoom: {
    type: Number,
    default: 13,
  },
})

const emit = defineEmits<{
  (e: 'map-ready', map: mapboxgl.Map): void
}>()

const containerEl = ref<HTMLElement | null>(null)
let map: mapboxgl.Map | null = null

// ── Eco Event Label Mapping ──
const ecoEventLabels: Record<number, string> = {
  [EcoDrivingEventType.Braking]: 'HARD BRAKE',
  [EcoDrivingEventType.Acceleration]: 'HARD ACCEL',
  [EcoDrivingEventType.Cornering]: 'CORNERING',
  [EcoDrivingEventType.CorneringLeft]: 'CORNER L',
  [EcoDrivingEventType.CorneringRight]: 'CORNER R',
  [EcoDrivingEventType.Bump]: 'BUMP',
  [EcoDrivingEventType.LongClutch]: 'LONG CLUTCH',
  [EcoDrivingEventType.DriveOnNeutral]: 'NEUTRAL',
  [EcoDrivingEventType.LongFreeWheel]: 'FREEWHEEL',
}

const severityColors: Record<number, string> = {
  [EventSeverity.None]: '#888888',
  [EventSeverity.Low]: '#CCFF00',
  [EventSeverity.Medium]: '#FF9900',
  [EventSeverity.High]: '#FF3333',
}

// ── Convert positions to GeoJSON ──
function positionsToGeoJson(positions: ApiHistoryEntry[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: positions.map((p) => [parseFloat(p.Lng), parseFloat(p.Lat)]),
    },
  }
}

function ecoEventsToGeoJson(events: ApiEcoDrivingEvent[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: events.map((e) => ({
      type: 'Feature' as const,
      properties: {
        eventType: e.EventType,
        severity: e.EventSeverity,
        speed: e.Speed,
        label: ecoEventLabels[e.EventType] || 'EVENT',
        color: severityColors[e.EventSeverity] || '#FF3333',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [e.Position.Longitude, e.Position.Latitude],
      },
    })),
  }
}

// ── Desaturate base map layers ──
function desaturateBaseMap(m: mapboxgl.Map) {
  const style = m.getStyle()
  if (!style || !style.layers) return

  for (const layer of style.layers) {
    // Desaturate road/land/water colors to grey
    if (layer.type === 'background') {
      m.setPaintProperty(layer.id, 'background-color', '#0a0a0a')
    }
    if (layer.type === 'fill') {
      try { m.setPaintProperty(layer.id, 'fill-color', '#0f0f0f') } catch { /* skip protected layers */ }
    }
    if (layer.type === 'line' && layer.id.includes('road')) {
      try { m.setPaintProperty(layer.id, 'line-color', '#1a1a1a') } catch { /* skip */ }
    }
    // Dim labels
    if (layer.type === 'symbol') {
      try {
        m.setPaintProperty(layer.id, 'text-color', '#333333')
        m.setPaintProperty(layer.id, 'text-halo-color', '#0a0a0a')
      } catch { /* skip */ }
    }
  }
}

// ── Add/Update Layers ──
function updateTrailLayers(m: mapboxgl.Map) {
  // ── Ghost Trail (dashed volt green) ──
  const ghostGeoJson = positionsToGeoJson(props.ghostPositions)
  if (m.getSource('ghost-trail')) {
    (m.getSource('ghost-trail') as mapboxgl.GeoJSONSource).setData(ghostGeoJson)
  } else if (props.ghostPositions.length > 1) {
    m.addSource('ghost-trail', { type: 'geojson', data: ghostGeoJson })
    m.addLayer({
      id: 'ghost-trail-line',
      type: 'line',
      source: 'ghost-trail',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#CCFF00',
        'line-width': 4,
        'line-opacity': 0.6,
        'line-dasharray': [2, 3],
      },
    })
  }

  // ── Reality Trail (solid hyper blue with glow) ──
  const realityGeoJson = positionsToGeoJson(props.realityPositions)
  if (m.getSource('reality-trail')) {
    (m.getSource('reality-trail') as mapboxgl.GeoJSONSource).setData(realityGeoJson)
  } else if (props.realityPositions.length > 1) {
    m.addSource('reality-trail', { type: 'geojson', data: realityGeoJson })
    // Glow layer (wider, blurred)
    m.addLayer({
      id: 'reality-trail-glow',
      type: 'line',
      source: 'reality-trail',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#0033FF',
        'line-width': 12,
        'line-opacity': 0.25,
        'line-blur': 8,
      },
    })
    // Core line
    m.addLayer({
      id: 'reality-trail-line',
      type: 'line',
      source: 'reality-trail',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#0033FF',
        'line-width': 5,
        'line-opacity': 1.0,
      },
    })
  }

  // ── Eco-Driving Event Markers ──
  const ecoGeoJson = ecoEventsToGeoJson(props.ecoEvents)
  if (m.getSource('eco-events')) {
    (m.getSource('eco-events') as mapboxgl.GeoJSONSource).setData(ecoGeoJson)
  } else if (props.ecoEvents.length > 0) {
    m.addSource('eco-events', { type: 'geojson', data: ecoGeoJson })
    // Pulsing circle (outer glow)
    m.addLayer({
      id: 'eco-events-glow',
      type: 'circle',
      source: 'eco-events',
      paint: {
        'circle-radius': 12,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.2,
        'circle-blur': 1,
      },
    })
    // Inner dot
    m.addLayer({
      id: 'eco-events-dot',
      type: 'circle',
      source: 'eco-events',
      paint: {
        'circle-radius': 5,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#000000',
      },
    })
    // Labels
    m.addLayer({
      id: 'eco-events-label',
      type: 'symbol',
      source: 'eco-events',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 9,
        'text-offset': [0, 1.8],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': '#000000',
        'text-halo-width': 1,
      },
    })
  }
} // End updateTrailLayers

// ── Moving Markers ──
function updateMarkers(m: mapboxgl.Map) {
  if (props.ghostCurrentPosition) {
    const p = props.ghostCurrentPosition
    const geoJson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature', properties: {},
        geometry: { type: 'Point', coordinates: [parseFloat(p.Lng), parseFloat(p.Lat)] }
      }]
    }
    if (m.getSource('ghost-marker')) {
      (m.getSource('ghost-marker') as mapboxgl.GeoJSONSource).setData(geoJson)
    } else {
      m.addSource('ghost-marker', { type: 'geojson', data: geoJson })
      m.addLayer({
        id: 'ghost-marker-layer', type: 'circle', source: 'ghost-marker',
        paint: {
          'circle-radius': 6,
          'circle-color': '#CCFF00',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000',
        }
      })
    }
  }

  if (props.realityCurrentPosition) {
    const p = props.realityCurrentPosition
    const geoJson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature', properties: {},
        geometry: { type: 'Point', coordinates: [parseFloat(p.Lng), parseFloat(p.Lat)] }
      }]
    }
    if (m.getSource('reality-marker')) {
      (m.getSource('reality-marker') as mapboxgl.GeoJSONSource).setData(geoJson)
    } else {
      m.addSource('reality-marker', { type: 'geojson', data: geoJson })
      m.addLayer({
        id: 'reality-marker-layer', type: 'circle', source: 'reality-marker',
        paint: {
          'circle-radius': 7,
          'circle-color': '#0033FF',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 1,
        }
      })
    }
  }
}

// ── Fit map bounds to trail ──
function fitToTrail(m: mapboxgl.Map) {
  const positions = props.realityPositions.length > 0 ? props.realityPositions : props.ghostPositions
  if (positions.length < 2) return

  const bounds = new mapboxgl.LngLatBounds()
  positions.forEach((p) => bounds.extend([parseFloat(p.Lng), parseFloat(p.Lat)]))
  m.fitBounds(bounds, { padding: 60, duration: 1000 })
}

// ── Lifecycle ──
onMounted(() => {
  if (!containerEl.value) return

  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token || token === 'pk.placeholder_paste_your_token_here') {
    console.warn('[MapContainer] No Mapbox token set in .env')
    return
  }

  mapboxgl.accessToken = token

  map = new mapboxgl.Map({
    container: containerEl.value,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: props.initialCenter as [number, number],
    zoom: props.initialZoom,
    pitch: 50,
    bearing: -17.6,
    antialias: true,
  })

  map.on('style.load', () => {
    if (!map) return

    // 1. Desaturate base layers for monochrome look
    desaturateBaseMap(map)

    // 2. Add 3D buildings (City Canyon)
    const layers = map.getStyle()?.layers
    let labelLayerId: string | undefined
    if (layers) {
      for (const layer of layers) {
        if (layer.type === 'symbol' && (layer.layout as any)?.['text-field']) {
          labelLayerId = layer.id
          break
        }
      }
    }

    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#1a1a1a',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.85,
        },
      },
      labelLayerId
    )

    // 3. Set dark lighting
    map.setLight({
      anchor: 'map',
      color: '#444',
      intensity: 0.3,
    })

    // 4. Add trail layers if data is already available
    updateTrailLayers(map)
    fitToTrail(map)

    emit('map-ready', map)
  })

  // Disable rotation on touch (mobile usability)
  map.touchZoomRotate.disableRotation()
})

// ── Drone Camera Control ──
let lastRealityCoords: [number, number] | null = null
let smoothBearing = 0

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon)
  let brng = Math.atan2(y, x) * 180 / Math.PI
  return (brng + 360) % 360
}

// Watch for base trail changes (only happens when trip is selected or animated reality trail chunk adds a point)
watch(
  () => [
    props.realityPositions, 
    props.ghostPositions, 
    props.ecoEvents
  ],
  () => {
    if (map && map.isStyleLoaded()) {
      updateTrailLayers(map)
    }
  },
  { deep: true }
)

// Watch for frame-by-frame 60fps moving markers
watch(
  () => [
    props.realityCurrentPosition, 
    props.ghostCurrentPosition,
    props.cameraFollowReality
  ],
  () => {
    if (map && map.isStyleLoaded()) {
      updateMarkers(map)

      // Drone Camera Tracking (smooth follow)
      if (props.cameraFollowReality && props.realityCurrentPosition) {
        const curLng = parseFloat(props.realityCurrentPosition.Lng)
        const curLat = parseFloat(props.realityCurrentPosition.Lat)
        
        // Calculate bearing with low-pass filter
        if (lastRealityCoords) {
           const dist = Math.sqrt(Math.pow(lastRealityCoords[0] - curLng, 2) + Math.pow(lastRealityCoords[1] - curLat, 2))
           if (dist > 0.00005) { // Update target bearing only when moving significantly
             const targetBearing = calculateBearing(lastRealityCoords[1], lastRealityCoords[0], curLat, curLng)
             let diff = targetBearing - smoothBearing
             while (diff > 180) diff -= 360
             while (diff < -180) diff += 360
             smoothBearing += diff * 0.1 // 10% interpolation factor
             lastRealityCoords = [curLng, curLat]
           }
        } else {
           lastRealityCoords = [curLng, curLat]
           smoothBearing = map.getBearing()
        }
        
        // Because props change 60 times a second, we just jump instantly.
        map.jumpTo({
          center: [curLng, curLat],
          zoom: Math.max(map.getZoom(), 16),
          pitch: 60,
          bearing: smoothBearing
        })

      } else if (!props.cameraFollowReality) {
        lastRealityCoords = null
      }
    }
  },
  { deep: true }
)

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-container :deep(.mapboxgl-ctrl-attrib),
.map-container :deep(.mapboxgl-ctrl-logo) {
  opacity: 0.3;
}
</style>
