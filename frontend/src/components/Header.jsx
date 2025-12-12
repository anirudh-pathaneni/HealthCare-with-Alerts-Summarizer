import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.css'

function Header() {
    const { user, logout, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    const isActive = (path) => location.pathname === path

    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    <div className="logo-icon">
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="logoGradPremium" x1="0" y1="0" x2="40" y2="40">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                            <circle cx="20" cy="20" r="18" stroke="url(#logoGradPremium)" strokeWidth="2.5" className="pulse-animation" />
                            <path d="M12 20 L16 20 L19 13 L23 27 L26 20 L30 20"
                                stroke="url(#logoGradPremium)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="logo-text">
                        <span className="logo-title gradient-text">HealthCare</span>
                        <span className="logo-subtitle">AIOps Monitor</span>
                    </div>
                </Link>

                <nav className="nav">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        <span>Dashboard</span>
                    </Link>

                    {/* Placeholder for future links
                    <Link to="/alerts" className={`nav-link ${isActive('/alerts') ? 'active' : ''}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <span>Alerts</span>
                    </Link>
                    */}

                    {isAuthenticated && (
                        <div className="nav-user">
                            <div className="user-pill">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <span className="user-name">{user?.username || 'Admin'}</span>
                                <button className="logout-btn-icon" onClick={handleLogout} title="Logout">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    )
}

export default Header
