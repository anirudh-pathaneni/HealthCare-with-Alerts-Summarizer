import { Link } from 'react-router-dom'
import './PatientCard.css'

function PatientCard({ patient }) {
    const { id, name, bedNumber, vitals, alertSeverity, age, gender, admissionDate } = patient

    const getSeverityClass = (severity) => {
        switch (severity) {
            case 'critical': return 'severity-critical'
            case 'warning': return 'severity-warning'
            case 'info': return 'severity-info'
            default: return 'severity-normal'
        }
    }

    const getSeverityLabel = (severity) => {
        switch (severity) {
            case 'critical': return 'Critical'
            case 'warning': return 'Warning'
            case 'info': return 'Info'
            default: return 'Stable'
        }
    }

    return (
        <Link to={`/patient/${id}`} className="patient-card glass-card">
            <div className="card-header">
                <div className="patient-info">
                    <div className="patient-avatar">
                        {name.charAt(0)}
                    </div>
                    <div className="patient-details">
                        <h3 className="patient-name">{name}</h3>
                        <p className="patient-meta">
                            {age}y • {gender} • Bed {bedNumber}
                        </p>
                    </div>
                </div>
                <div className={`severity-badge ${getSeverityClass(alertSeverity)}`}>
                    <span className="severity-dot"></span>
                    {getSeverityLabel(alertSeverity)}
                </div>
            </div>

            <div className="vitals-grid">
                <div className="vital-item">
                    <div className="vital-icon heart-rate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div className="vital-data">
                        <span className="vital-value">{vitals.heartRate}</span>
                        <span className="vital-unit">bpm</span>
                    </div>
                    <span className="vital-label">Heart Rate</span>
                </div>

                <div className="vital-item">
                    <div className="vital-icon spo2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <div className="vital-data">
                        <span className="vital-value">{vitals.spO2}</span>
                        <span className="vital-unit">%</span>
                    </div>
                    <span className="vital-label">SpO₂</span>
                </div>

                <div className="vital-item">
                    <div className="vital-icon blood-pressure">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                    <div className="vital-data">
                        <span className="vital-value">{vitals.bloodPressure.systolic}/{vitals.bloodPressure.diastolic}</span>
                        <span className="vital-unit">mmHg</span>
                    </div>
                    <span className="vital-label">Blood Pressure</span>
                </div>

                <div className="vital-item">
                    <div className="vital-icon temperature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                        </svg>
                    </div>
                    <div className="vital-data">
                        <span className="vital-value">{vitals.temperature}</span>
                        <span className="vital-unit">°C</span>
                    </div>
                    <span className="vital-label">Temperature</span>
                </div>
            </div>

            <div className="card-footer">
                <span className="admission-date">
                    Admitted: {new Date(admissionDate).toLocaleDateString()}
                </span>
                <span className="view-details">
                    View Details
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </span>
            </div>
        </Link>
    )
}

export default PatientCard
