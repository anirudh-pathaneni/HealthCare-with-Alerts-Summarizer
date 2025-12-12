import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.css'

function Header() {
    const { user, logout, isAuthenticated } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <header className="app-header">
            <div className="app-header-inner">
                {/* Left: Dashboard Link */}
                <nav className="app-nav-left">
                    <Link to="/" className="app-nav-link">
                        <svg className="app-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Dashboard
                    </Link>
                </nav>

                {/* Center: Logo */}
                <Link to="/" className="app-logo">
                    <div className="app-logo-icon">
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" stroke="url(#logoGradHeader)" strokeWidth="2" />
                            <path d="M10 20 L15 20 L18 14 L22 26 L25 20 L30 20"
                                stroke="url(#logoGradHeader)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="logoGradHeader" x1="0" y1="0" x2="40" y2="40">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div className="app-logo-text">
                        <span className="app-logo-title">HealthCare</span>
                        <span className="app-logo-subtitle">AIOps Monitor</span>
                    </div>
                </Link>

                {/* Right: User Info */}
                <div className="app-nav-right">
                    {isAuthenticated && (
                        <div className="app-user-section">
                            <span className="app-user-icon">👤</span>
                            <span className="app-user-name">{user?.username || 'Admin'}</span>
                            <button className="app-logout-btn" onClick={handleLogout}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Header
