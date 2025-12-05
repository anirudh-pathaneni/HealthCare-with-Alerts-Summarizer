import { useState, useEffect } from 'react'
import PatientCard from '../components/PatientCard'
import { getPatients, getAlerts } from '../services/api'
import './Dashboard.css'

// Mock data for demo when API is not available
const mockPatients = [
    {
        id: 'P001',
        name: 'John Smith',
        bedNumber: 'ICU-101',
        age: 65,
        gender: 'Male',
        admissionDate: '2024-11-28',
        vitals: {
            heartRate: 82,
            spO2: 97,
            bloodPressure: { systolic: 128, diastolic: 78 },
            temperature: 36.8,
            respiratory: 16
        },
        alertSeverity: 'normal'
    },
    {
        id: 'P002',
        name: 'Sarah Johnson',
        bedNumber: 'ICU-102',
        age: 45,
        gender: 'Female',
        admissionDate: '2024-11-30',
        vitals: {
            heartRate: 108,
            spO2: 94,
            bloodPressure: { systolic: 145, diastolic: 92 },
            temperature: 37.2,
            respiratory: 20
        },
        alertSeverity: 'warning'
    },
    {
        id: 'P003',
        name: 'Michael Brown',
        bedNumber: 'ICU-103',
        age: 72,
        gender: 'Male',
        admissionDate: '2024-11-25',
        vitals: {
            heartRate: 54,
            spO2: 88,
            bloodPressure: { systolic: 185, diastolic: 105 },
            temperature: 38.4,
            respiratory: 24
        },
        alertSeverity: 'critical'
    },
    {
        id: 'P004',
        name: 'Emily Davis',
        bedNumber: 'ICU-104',
        age: 38,
        gender: 'Female',
        admissionDate: '2024-12-01',
        vitals: {
            heartRate: 76,
            spO2: 98,
            bloodPressure: { systolic: 118, diastolic: 72 },
            temperature: 36.6,
            respiratory: 14
        },
        alertSeverity: 'normal'
    },
    {
        id: 'P005',
        name: 'Robert Wilson',
        bedNumber: 'ICU-105',
        age: 58,
        gender: 'Male',
        admissionDate: '2024-11-29',
        vitals: {
            heartRate: 95,
            spO2: 92,
            bloodPressure: { systolic: 158, diastolic: 95 },
            temperature: 37.8,
            respiratory: 22
        },
        alertSeverity: 'warning'
    },
    {
        id: 'P006',
        name: 'Jennifer Martinez',
        bedNumber: 'ICU-106',
        age: 51,
        gender: 'Female',
        admissionDate: '2024-12-02',
        vitals: {
            heartRate: 88,
            spO2: 96,
            bloodPressure: { systolic: 132, diastolic: 84 },
            temperature: 36.9,
            respiratory: 17
        },
        alertSeverity: 'info'
    },
    {
        id: 'P007',
        name: 'David Lee',
        bedNumber: 'ICU-107',
        age: 69,
        gender: 'Male',
        admissionDate: '2024-11-27',
        vitals: {
            heartRate: 62,
            spO2: 95,
            bloodPressure: { systolic: 140, diastolic: 88 },
            temperature: 37.0,
            respiratory: 15
        },
        alertSeverity: 'normal'
    },
    {
        id: 'P008',
        name: 'Lisa Anderson',
        bedNumber: 'ICU-108',
        age: 43,
        gender: 'Female',
        admissionDate: '2024-12-03',
        vitals: {
            heartRate: 120,
            spO2: 86,
            bloodPressure: { systolic: 192, diastolic: 110 },
            temperature: 39.2,
            respiratory: 28
        },
        alertSeverity: 'critical'
    }
]

function Dashboard() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [stats, setStats] = useState({ critical: 0, warning: 0, normal: 0 })

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const data = await getPatients()
                setPatients(data)
                calculateStats(data)
            } catch (err) {
                console.warn('Using mock data:', err.message)
                setPatients(mockPatients)
                calculateStats(mockPatients)
            } finally {
                setLoading(false)
            }
        }

        fetchData()

        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [])

    const calculateStats = (data) => {
        const stats = data.reduce((acc, patient) => {
            acc[patient.alertSeverity] = (acc[patient.alertSeverity] || 0) + 1
            return acc
        }, { critical: 0, warning: 0, info: 0, normal: 0 })
        setStats(stats)
    }

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading patient data...</p>
            </div>
        )
    }

    return (
        <div className="dashboard container">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1 className="page-title">Patient Monitoring Dashboard</h1>
                    <p className="page-subtitle">Real-time ICU patient vitals and alerts</p>
                </div>
                <div className="stats-bar">
                    <div className="stat-item critical">
                        <span className="stat-value">{stats.critical || 0}</span>
                        <span className="stat-label">Critical</span>
                    </div>
                    <div className="stat-item warning">
                        <span className="stat-value">{stats.warning || 0}</span>
                        <span className="stat-label">Warning</span>
                    </div>
                    <div className="stat-item normal">
                        <span className="stat-value">{(stats.normal || 0) + (stats.info || 0)}</span>
                        <span className="stat-label">Stable</span>
                    </div>
                    <div className="stat-item total">
                        <span className="stat-value">{patients.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                </div>
            </div>

            <div className="patients-grid">
                {patients.map((patient, index) => (
                    <PatientCard
                        key={patient.id}
                        patient={patient}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    />
                ))}
            </div>
        </div>
    )
}

export default Dashboard
