import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
    return (
        <header className="header">
            <div className="container header-content">
                <Link to="/" className="logo">
                    <div className="logo-icon">
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" strokeWidth="2" />
                            <path d="M10 20 L15 20 L18 14 L22 26 L25 20 L30 20"
                                stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                                    <stop offset="0%" stopColor="#667eea" />
                                    <stop offset="100%" stopColor="#764ba2" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div className="logo-text">
                        <span className="logo-title gradient-text">HealthCare</span>
                        <span className="logo-subtitle">AIOps Monitor</span>
                    </div>
                </Link>

                <nav className="nav">
                    <Link to="/" className="nav-link">
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Dashboard
                    </Link>
                    <div className="nav-status">
                        <span className="status-dot"></span>
                        <span className="status-text">System Online</span>
                    </div>
                </nav>
            </div>
        </header>
    )
}

export default Header
