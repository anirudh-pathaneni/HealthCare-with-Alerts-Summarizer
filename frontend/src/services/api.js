import axios from 'axios'

// In production (via Ingress), use relative paths. In development, use localhost ports.
const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
// Test
const API_BASE_URL = import.meta.env.VITE_API_URL || (isProduction ? '' : 'http://localhost:8001')
const ALERTS_API_URL = import.meta.env.VITE_ALERTS_API_URL || (isProduction ? '' : 'http://localhost:8002')
const SUMMARIZER_API_URL = import.meta.env.VITE_SUMMARIZER_API_URL || (isProduction ? '' : 'http://localhost:8003')
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || (isProduction ? '' : 'http://localhost:8004')

const vitalsApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

const alertsApi = axios.create({
    baseURL: ALERTS_API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

const summarizerApi = axios.create({
    baseURL: SUMMARIZER_API_URL,
    timeout: 120000,  // 2 minutes for model inference
    headers: {
        'Content-Type': 'application/json'
    }
})

// Patients & Vitals API
export const getPatients = async () => {
    const response = await vitalsApi.get('/api/patients')
    return response.data
}

export const getPatientById = async (patientId) => {
    const response = await vitalsApi.get(`/api/patients/${patientId}`)
    return response.data
}

export const getPatientVitals = async (patientId) => {
    const response = await vitalsApi.get(`/api/patients/${patientId}/vitals`)
    return response.data
}

export const getPatientVitalsHistory = async (patientId, hours = 24) => {
    const response = await vitalsApi.get(`/api/patients/${patientId}/vitals/history`, {
        params: { hours }
    })
    return response.data
}

// Alerts API
export const getAlerts = async () => {
    const response = await alertsApi.get('/api/alerts')
    return response.data
}

export const getPatientAlerts = async (patientId) => {
    const response = await alertsApi.get(`/api/alerts/${patientId}`)
    return response.data
}

// Summarizer API
export const getSummaries = async () => {
    const response = await summarizerApi.get('/api/summaries')
    return response.data
}

export const getPatientSummary = async (patientId) => {
    const response = await summarizerApi.get(`/api/summaries/${patientId}`)
    return response.data
}

export const getModelInfo = async () => {
    const response = await summarizerApi.get('/api/model/info')
    return response.data
}

export const triggerSummary = async (patientId) => {
    const response = await summarizerApi.post('/api/model/trigger-summary', { patientId })
    return response.data
}

// WebSocket connection for real-time vitals
export const createVitalsWebSocket = (patientId, onMessage, onError) => {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/vitals/${patientId}`
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        onMessage(data)
    }

    ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (onError) onError(error)
    }

    return ws
}

// Health check
export const healthCheck = async () => {
    try {
        const [vitals, alerts, summarizer] = await Promise.all([
            vitalsApi.get('/health'),
            alertsApi.get('/health'),
            summarizerApi.get('/health')
        ])
        return {
            vitals: vitals.data.status === 'healthy',
            alerts: alerts.data.status === 'healthy',
            summarizer: summarizer.data.status === 'healthy'
        }
    } catch (error) {
        console.error('Health check failed:', error)
        return { vitals: false, alerts: false, summarizer: false }
    }
}

// Auth API - now uses vitals-generator service (same as API_BASE_URL)
export const authApi = {
    login: async (username, password) => {
        const response = await vitalsApi.post('/api/auth/login', { username, password })
        return response.data
    },

    logout: async () => {
        const response = await vitalsApi.post('/api/auth/logout')
        return response.data
    },

    verify: async (token) => {
        const response = await vitalsApi.get('/api/auth/verify', {
            params: { token }
        })
        return response.data
    }
}
