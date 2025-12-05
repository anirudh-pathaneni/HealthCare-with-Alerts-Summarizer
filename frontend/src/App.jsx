import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import PatientDetails from './pages/PatientDetails'
import './App.css'

function App() {
    return (
        <Router>
            <div className="app">
                <Header />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/patient/:id" element={<PatientDetails />} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

export default App
