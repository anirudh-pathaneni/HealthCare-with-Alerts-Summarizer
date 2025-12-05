import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import VitalsChart from '../components/VitalsChart'
import AlertPanel from '../components/AlertPanel'
import SummaryCard from '../components/SummaryCard'
import {
    getPatientById,
    getPatientVitalsHistory,
    getPatientAlerts,
    getPatientSummary,
    getModelInfo,
    createVitalsWebSocket
} from '../services/api'
import './PatientDetails.css'

// Mock data
const mockPatient = {
    id: 'P003',
    name: 'Michael Brown',
    bedNumber: 'ICU-103',
    age: 72,
    gender: 'Male',
    admissionDate: '2024-11-25',
    diagnosis: 'Acute Respiratory Distress Syndrome (ARDS)',
    attendingPhysician: 'Dr. James Wilson',
    vitals: {
        heartRate: 54,
        spO2: 88,
        bloodPressure: { systolic: 185, diastolic: 105 },
        temperature: 38.4,
        respiratory: 24
    },
    alertSeverity: 'critical'
}

const mockAlerts = [
    {
        id: 1,
        type: 'Hypoxia Alert',
        message: 'SpO2 dropped below 90% threshold. Current reading: 88%',
        severity: 'critical',
        timestamp: new Date(Date.now() - 300000).toISOString()
    },
    {
        id: 2,
        type: 'Hypertensive Crisis',
        message: 'Systolic BP exceeds 180 mmHg. Current: 185/105 mmHg',
        severity: 'critical',
        timestamp: new Date(Date.now() - 600000).toISOString()
    },
    {
        id: 3,
        type: 'Fever Alert',
        message: 'Temperature above 38.0°C threshold. Current: 38.4°C',
        severity: 'warning',
        timestamp: new Date(Date.now() - 1200000).toISOString()
    },
    {
        id: 4,
        type: 'Bradycardia Alert',
        message: 'Heart rate below 60 bpm. Current reading: 54 bpm',
        severity: 'warning',
        timestamp: new Date(Date.now() - 1800000).toISOString()
    }
]

const mockSummary = {
    text: "Patient Michael Brown, 72-year-old male, currently experiencing acute respiratory distress with concerning vital signs. SpO2 levels have dropped to 88%, indicating significant hypoxia requiring immediate attention. Blood pressure remains critically elevated at 185/105 mmHg, suggesting hypertensive crisis. Temperature elevated at 38.4°C. Heart rate shows bradycardia at 54 bpm. Patient requires close monitoring and immediate clinical intervention. Current treatment protocol includes supplemental oxygen therapy and antihypertensive medications. Recommend continuous cardiac monitoring and respiratory support assessment.",
    timestamp: new Date(Date.now() - 120000).toISOString()
}

const mockModelInfo = {
    name: 'DistilBART-Medical',
    version: '1.2.3',
    lastUpdated: '2024-12-01',
    accuracy: 0.94
}

function generateMockVitalsHistory(type, baseValue, variance) {
    const now = Date.now()
    const data = []
    for (let i = 60; i >= 0; i--) {
        data.push({
            timestamp: new Date(now - i * 60000).toISOString(),
            value: baseValue + (Math.random() - 0.5) * variance
        })
    }
    return data
}

function PatientDetails() {
    const { id } = useParams()
    const [patient, setPatient] = useState(null)
    const [vitalsHistory, setVitalsHistory] = useState({})
    const [alerts, setAlerts] = useState([])
    const [summary, setSummary] = useState(null)
    const [modelInfo, setModelInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)

                const [patientData, alertsData, summaryData, modelData] = await Promise.all([
                    getPatientById(id),
                    getPatientAlerts(id),
                    getPatientSummary(id),
                    getModelInfo()
                ])

                setPatient(patientData)
                setAlerts(alertsData)
                setSummary(summaryData)
                setModelInfo(modelData)

                // Fetch vitals history
                const history = await getPatientVitalsHistory(id)
                setVitalsHistory(history)
            } catch (err) {
                console.warn('Using mock data:', err.message)
                setPatient({ ...mockPatient, id })
                setAlerts(mockAlerts)
                setSummary(mockSummary)
                setModelInfo(mockModelInfo)
                setVitalsHistory({
                    heartRate: generateMockVitalsHistory('heartRate', 54, 20),
                    spO2: generateMockVitalsHistory('spO2', 88, 8),
                    systolic: generateMockVitalsHistory('systolic', 185, 30),
                    diastolic: generateMockVitalsHistory('diastolic', 105, 15),
                    temperature: generateMockVitalsHistory('temperature', 38.4, 1),
                    respiratory: generateMockVitalsHistory('respiratory', 24, 6)
                })
            } finally {
                setLoading(false)
            }
        }

        fetchData()

        // Set up WebSocket for real-time updates
        let ws
        try {
            ws = createVitalsWebSocket(id, (data) => {
                setVitalsHistory(prev => {
                    const updated = { ...prev }
                    Object.keys(data).forEach(key => {
                        if (updated[key]) {
                            updated[key] = [...updated[key].slice(1), {
                                timestamp: new Date().toISOString(),
                                value: data[key]
                            }]
                        }
                    })
                    return updated
                })
            })
        } catch (e) {
            console.log('WebSocket not available, using polling')
        }

        // Refresh every 10 seconds
        const interval = setInterval(fetchData, 10000)

        return () => {
            clearInterval(interval)
            if (ws) ws.close()
        }
    }, [id])

    if (loading || !patient) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading patient data...</p>
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
                        <span className="pill-value">{patient.vitals.heartRate}</span>
                        <span className="pill-unit">bpm</span>
                    </div>
                    <div className="vital-pill spo2">
                        <span className="pill-label">SpO₂</span>
                        <span className="pill-value">{patient.vitals.spO2}</span>
                        <span className="pill-unit">%</span>
                    </div>
                    <div className="vital-pill blood-pressure">
                        <span className="pill-label">BP</span>
                        <span className="pill-value">{patient.vitals.bloodPressure.systolic}/{patient.vitals.bloodPressure.diastolic}</span>
                        <span className="pill-unit">mmHg</span>
                    </div>
                    <div className="vital-pill temperature">
                        <span className="pill-label">Temp</span>
                        <span className="pill-value">{patient.vitals.temperature}</span>
                        <span className="pill-unit">°C</span>
                    </div>
                    <div className="vital-pill respiratory">
                        <span className="pill-label">Resp</span>
                        <span className="pill-value">{patient.vitals.respiratory}</span>
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
                        <VitalsChart
                            data={vitalsHistory.heartRate || []}
                            type="heartRate"
                            title="Heart Rate"
                            unit="bpm"
                            color="#f45c43"
                            gradientId="hrGradient"
                        />
                        <VitalsChart
                            data={vitalsHistory.spO2 || []}
                            type="spO2"
                            title="Oxygen Saturation"
                            unit="%"
                            color="#38ef7d"
                            gradientId="spo2Gradient"
                        />
                        <VitalsChart
                            data={vitalsHistory.systolic || []}
                            type="systolic"
                            title="Systolic BP"
                            unit="mmHg"
                            color="#667eea"
                            gradientId="systolicGradient"
                        />
                        <VitalsChart
                            data={vitalsHistory.temperature || []}
                            type="temperature"
                            title="Temperature"
                            unit="°C"
                            color="#f5af19"
                            gradientId="tempGradient"
                        />
                        <VitalsChart
                            data={vitalsHistory.respiratory || []}
                            type="respiratory"
                            title="Respiratory Rate"
                            unit="/min"
                            color="#00c6ff"
                            gradientId="respGradient"
                        />
                        <VitalsChart
                            data={vitalsHistory.diastolic || []}
                            type="diastolic"
                            title="Diastolic BP"
                            unit="mmHg"
                            color="#764ba2"
                            gradientId="diastolicGradient"
                        />
                    </div>
                </div>

                <div className="side-panels">
                    <AlertPanel alerts={alerts} />
                    <SummaryCard summary={summary} modelInfo={modelInfo} />
                </div>
            </div>
        </div>
    )
}

export default PatientDetails
