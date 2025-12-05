import './AlertPanel.css'

function AlertPanel({ alerts }) {
    const getSeverityClass = (severity) => {
        switch (severity) {
            case 'critical': return 'alert-critical'
            case 'warning': return 'alert-warning'
            case 'info': return 'alert-info'
            default: return 'alert-normal'
        }
    }

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                )
            case 'warning':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                )
            default:
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                )
        }
    }

    const formatTime = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="alert-panel glass-card">
            <div className="panel-header">
                <h3 className="panel-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    Medical Alerts
                </h3>
                <span className="alert-count">{alerts.length} Active</span>
            </div>

            <div className="alerts-list">
                {alerts.length === 0 ? (
                    <div className="no-alerts">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <p>No active alerts</p>
                    </div>
                ) : (
                    alerts.map((alert, index) => (
                        <div key={index} className={`alert-item ${getSeverityClass(alert.severity)}`}>
                            <div className="alert-icon">
                                {getSeverityIcon(alert.severity)}
                            </div>
                            <div className="alert-content">
                                <h4 className="alert-title">{alert.type}</h4>
                                <p className="alert-message">{alert.message}</p>
                                <span className="alert-time">{formatTime(alert.timestamp)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default AlertPanel
