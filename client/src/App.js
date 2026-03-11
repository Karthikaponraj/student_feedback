import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiClient } from './utils/apiClient';
import { API_BASE_URL } from './config/api';

import LoginPortal from './pages/LoginPortal';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import Profile from './pages/Profile';
import NotificationBell from './components/NotificationBell';
import './App.css';

const BackendHealthCheck = () => {
    const [isHealthy, setIsHealthy] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);

    const checkHealth = async () => {
        setIsRetrying(true);
        try {
            await apiClient('/health');
            setIsHealthy(true);
        } catch (error) {
            console.error("Backend Health Check Failed:", error);
            setIsHealthy(false);
        } finally {
            setIsRetrying(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    if (isHealthy) return null;

    return (
        <div style={{
            backgroundColor: '#e74c3c',
            color: 'white',
            padding: '10px',
            textAlign: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: 9999,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
            <strong>⚠️ Backend Connection Failed</strong>
            <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                Unable to connect to the server at {API_BASE_URL}.
            </p>
            <button
                onClick={checkHealth}
                disabled={isRetrying}
                style={{
                    backgroundColor: 'white',
                    color: '#e74c3c',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                }}
            >
                {isRetrying ? 'Retrying...' : 'Retry Connection'}
            </button>
        </div>
    );
};

const Navbar = ({ theme, toggleTheme }) => {
    const { currentUser, userRole, logout } = useAuth();

    if (!currentUser) return null;

    const getUserName = () => {
        if (!currentUser) return 'User';
        if (currentUser.name) return currentUser.name;
        if (!currentUser.email) return 'User';

        const namePart = currentUser.email.split('@')[0];
        return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    };

    return (
        <nav className="navbar" style={{
            top: 0,
            left: 0,
            right: 0,
            width: '100%',
            borderRadius: 0,
            margin: 0,
            backgroundColor: 'var(--card-bg)'
        }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
                <h1 style={{
                    fontSize: '1.1rem',
                    letterSpacing: '0.1em',
                    color: 'var(--primary-slate)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        backgroundColor: 'var(--primary-slate)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                    }}>S</span>
                    {userRole === 'admin' ? 'ADMIN PANEL' : userRole === 'faculty' ? 'FACULTY PANEL' : 'STUDENT HUB'}
                </h1>
            </Link>
            <div className="nav-links">
                <NotificationBell />

                <button
                    onClick={toggleTheme}
                    className="nav-icon-btn"
                    title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                    {theme === 'light' ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    )}
                </button>

                <div style={{
                    height: '24px',
                    width: '1px',
                    backgroundColor: 'var(--border-color)',
                    margin: '0 10px'
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            color: 'var(--text-main)',
                            lineHeight: 1.2,
                            letterSpacing: '0.02em'
                        }}>{getUserName()}</div>
                        <div style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            opacity: 0.8
                        }}>{userRole}</div>
                    </div>

                    <Link to="/profile" className="nav-icon-link">
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-color)',
                            color: 'var(--primary-slate)',
                            transition: 'all 0.2s ease'
                        }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-slate)';
                                e.currentTarget.style.backgroundColor = 'var(--primary-slate)10';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.backgroundColor = 'var(--bg-color)';
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                    </Link>
                </div>

                <button onClick={logout} className="nav-icon-btn logout" style={{ marginLeft: '5px' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </nav>
    );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { currentUser, userRole, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!currentUser) return <Navigate to="/login" />;

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <div className="container"><h3>Access Denied. You are logged in as {userRole}.</h3></div>;
    }

    return children;
};

const DashboardRouter = () => {
    const { userRole } = useAuth();

    if (userRole === 'admin') {
        return <AdminDashboard />;
    } else if (userRole === 'faculty') {
        return <FacultyDashboard />;
    } else {
        return <StudentDashboard />;
    }
};

function App() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="App">
            <BackendHealthCheck />
            <Router>
                <AuthProvider>
                    {/* Navbar logic can be conditional if needed, but keeping it simple */}
                    <Routes>
                        <Route path="/login" element={<LoginPortal />} />
                        <Route path="/register/:role" element={<Register />} />
                        <Route path="/register" element={<Navigate to="/register/student" replace />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/" element={
                            <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
                                <>
                                    <Navbar theme={theme} toggleTheme={toggleTheme} />
                                    <DashboardRouter />
                                </>
                            </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
                                <>
                                    <Navbar theme={theme} toggleTheme={toggleTheme} />
                                    <Profile />
                                </>
                            </ProtectedRoute>
                        } />
                    </Routes>
                </AuthProvider>
            </Router>
        </div>
    );
}

export default App;
