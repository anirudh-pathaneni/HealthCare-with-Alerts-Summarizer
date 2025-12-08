import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import VitalsChart from '../components/VitalsChart'
import AlertPanel from '../components/AlertPanel'
import SummaryCard from '../components/SummaryCard'
import {
    getPatientById,
    getPatientVitalsHistory,
    getPatientAlerts,
    triggerSummary,
    getModelInfo,
    createVitalsWebSocket
} from '../services/api'
import './PatientDetails.css'

function PatientDetails() {
    const { id } = useParams()
    const [patient, setPatient] = useState(null)
    const [vitalsHistory, setVitalsHistory] = useState({})
    const [alerts, setAlerts] = useState([])
    const [summary, setSummary] = useState(null)
    const [modelInfo, setModelInfo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [summarizing, setSummarizing] = useState(false)

    // Initial load - only once
    useEffect(() => {
        const loadPatient = async () => {
            try {
                setLoading(true)
                setError(null)

                const patientData = await getPatientById(id)
                setPatient(patientData)

                // Load vitals history
                const history = await getPatientVitalsHistory(id)
                setVitalsHistory(history)

                // Load model info
                const modelData = await getModelInfo().catch(() => null)
                setModelInfo(modelData)

            } catch (err) {
                console.error('Error loading patient:', err.message)
                setError(`Failed to load patient: ${err.message}`)
            } finally {
                setLoading(false)
            }
        }

        loadPatient()
    }, [id])

    // Fetch alerts every 10 seconds
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const alertsData = await getPatientAlerts(id)
                setAlerts(alertsData || [])
            } catch (err) {
                console.error('Error fetching alerts:', err.message)
            }
        }

        // Initial fetch
        fetchAlerts()

        // Set up polling every 10 seconds
        const alertsInterval = setInterval(fetchAlerts, 10000)

        return () => clearInterval(alertsInterval)
    }, [id])

    // WebSocket for real-time vitals updates
    useEffect(() => {
        let ws
        try {
            ws = createVitalsWebSocket(id, (data) => {
                // Update current patient vitals
                setPatient(prev => prev ? {
                    ...prev,
                    vitals: {
                        heartRate: data.heartRate || prev.vitals?.heartRate,
                        spO2: data.spO2 || prev.vitals?.spO2,
                        bloodPressure: data.bloodPressure || prev.vitals?.bloodPressure,
                        temperature: data.temperature || prev.vitals?.temperature,
                        respiratory: data.respiratory || prev.vitals?.respiratory
                    }
                } : prev)

                // Update charts
                setVitalsHistory(prev => {
                    const updated = { ...prev }
                    const now = new Date().toISOString()

                    if (data.heartRate && updated.heartRate) {
                        updated.heartRate = [...updated.heartRate.slice(1), { timestamp: now, value: data.heartRate }]
                    }
                    if (data.spO2 && updated.spO2) {
                        updated.spO2 = [...updated.spO2.slice(1), { timestamp: now, value: data.spO2 }]
                    }
                    if (data.bloodPressure?.systolic && updated.systolic) {
                        updated.systolic = [...updated.systolic.slice(1), { timestamp: now, value: data.bloodPressure.systolic }]
                    }
                    if (data.bloodPressure?.diastolic && updated.diastolic) {
                        updated.diastolic = [...updated.diastolic.slice(1), { timestamp: now, value: data.bloodPressure.diastolic }]
                    }
                    if (data.temperature && updated.temperature) {
                        updated.temperature = [...updated.temperature.slice(1), { timestamp: now, value: data.temperature }]
                    }
                    if (data.respiratory && updated.respiratory) {
                        updated.respiratory = [...updated.respiratory.slice(1), { timestamp: now, value: data.respiratory }]
                    }

                    return updated
                })
            })
        } catch (e) {
            console.log('WebSocket not available')
        }

        return () => {
            if (ws) ws.close()
        }
    }, [id])

    // Button-triggered summary generation
    const handleGenerateSummary = useCallback(async () => {
        setSummarizing(true)
        try {
            // Summarize last 10 alerts (or all if less)
            const result = await triggerSummary(id)
            // API returns: { patient_id, patient_name, text, vitals_count, alerts_count, ... }
            const summaryText = typeof result === 'string' ? result : (result.text || result.summary || 'Summary generated successfully.')
            setSummary({
                text: summaryText,
                timestamp: result.timestamp || new Date().toISOString(),
                alertsCount: result.alerts_count || Math.min(alerts.length, 5)
            })
        } catch (err) {
            console.error('Failed to generate summary:', err.message)
            setSummary({
                text: 'Failed to generate summary. Please try again.',
                timestamp: new Date().toISOString(),
                error: true
            })
        } finally {
            setSummarizing(false)
        }
    }, [id, alerts.length])

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading patient data...</p>
            </div>
        )
    }

    if (error || !patient) {
        return (
            <div className="error-container">
                <div className="error-card glass-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="error-icon">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h2>Unable to Load Patient</h2>
                    <p>{error || 'Patient not found'}</p>
                    <Link to="/" className="back-button">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="patient-details container">
            <div className="breadcrumb">
                <Link to="/" className="breadcrumb-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to Dashboard
                </Link>
            </div>

            <div className="patient-header glass-card">
                <div className="patient-main-info">
                    <div className="patient-avatar-large">
                        {patient.name.charAt(0)}
                    </div>
                    <div className="patient-info-block">
                        <h1 className="patient-name-large">{patient.name}</h1>
                        <div className="patient-meta-row">
                            <span className="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                {patient.age}y • {patient.gender}
                            </span>
                            <span className="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                Bed {patient.bedNumber}
                            </span>
                            <span className="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                Admitted: {new Date(patient.admissionDate).toLocaleDateString()}
                            </span>
                        </div>
                        {patient.diagnosis && (
                            <p className="patient-diagnosis">
                                <strong>Diagnosis:</strong> {patient.diagnosis}
                            </p>
                        )}
                    </div>
                </div>

                <div className="current-vitals-bar">
                    <div className="vital-pill heart-rate">
                        <span className="pill-label">HR</span>
                        <span className="pill-value">{patient.vitals?.heartRate || '--'}</span>
                        <span className="pill-unit">bpm</span>
                    </div>
                    <div className="vital-pill spo2">
                        <span className="pill-label">SpO₂</span>
                        <span className="pill-value">{patient.vitals?.spO2 || '--'}</span>
                        <span className="pill-unit">%</span>
                    </div>
                    <div className="vital-pill blood-pressure">
                        <span className="pill-label">BP</span>
                        <span className="pill-value">
                            {patient.vitals?.bloodPressure
                                ? `${patient.vitals.bloodPressure.systolic}/${patient.vitals.bloodPressure.diastolic}`
                                : '--/--'}
                        </span>
                        <span className="pill-unit">mmHg</span>
                    </div>
                    <div className="vital-pill temperature">
                        <span className="pill-label">Temp</span>
                        <span className="pill-value">{patient.vitals?.temperature || '--'}</span>
                        <span className="pill-unit">°C</span>
                    </div>
                    <div className="vital-pill respiratory">
                        <span className="pill-label">Resp</span>
                        <span className="pill-value">{patient.vitals?.respiratory || '--'}</span>
                        <span className="pill-unit">/min</span>
                    </div>
                </div>
            </div>

            <div className="details-grid">
                <div className="charts-section">
                    <h2 className="section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        Vital Signs Trends
                    </h2>
                    <div className="charts-grid">
                        <VitalsChart data={vitalsHistory.heartRate || []} type="heartRate" title="Heart Rate" unit="bpm" color="#f45c43" gradientId="hrGradient" />
                        <VitalsChart data={vitalsHistory.spO2 || []} type="spO2" title="Oxygen Saturation" unit="%" color="#38ef7d" gradientId="spo2Gradient" />
                        <VitalsChart data={vitalsHistory.systolic || []} type="systolic" title="Systolic BP" unit="mmHg" color="#667eea" gradientId="systolicGradient" />
                        <VitalsChart data={vitalsHistory.temperature || []} type="temperature" title="Temperature" unit="°C" color="#f5af19" gradientId="tempGradient" />
                        <VitalsChart data={vitalsHistory.respiratory || []} type="respiratory" title="Respiratory Rate" unit="/min" color="#00c6ff" gradientId="respGradient" />
                        <VitalsChart data={vitalsHistory.diastolic || []} type="diastolic" title="Diastolic BP" unit="mmHg" color="#764ba2" gradientId="diastolicGradient" />
                    </div>
                </div>

                <div className="side-panels">
                    <AlertPanel alerts={alerts} />
                    <SummaryCard
                        summary={summary}
                        modelInfo={modelInfo}
                        onGenerateSummary={handleGenerateSummary}
                        isGenerating={summarizing}
                        alertsCount={alerts.length}
                    />
                </div>
            </div>
        </div>
    )
}

export default PatientDetails
