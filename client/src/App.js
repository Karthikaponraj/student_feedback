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

const Navbar = () => {
    const { currentUser, userRole, logout } = useAuth();

    if (!currentUser) return null;

    const getUserName = () => {
        if (!currentUser) return 'User';
        if (currentUser.name) return currentUser.name;
        if (!currentUser.email) return 'User';

        const namePart = currentUser.email.split('@')[0];
        // Convert to Title Case
        return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    };

    return (
        <nav className="navbar">
            <Link to="/" style={{ textDecoration: 'none', color: '#2c3e50' }}>
                <h1>{userRole === 'admin' ? 'Admin Dashboard' : userRole === 'faculty' ? 'Faculty Dashboard' : 'Feedback Portal'}</h1>
            </Link>
            <div className="nav-links">
                <NotificationBell />
                <span style={{ marginRight: '15px' }}>
                    Hello, <strong>{getUserName()}</strong>
                </span>

                <Link to="/profile" title="My Profile" className="nav-icon-link">
                    <button className="nav-icon-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </button>
                </Link>

                <button onClick={logout} className="nav-icon-btn logout" title="Logout">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                    <Navbar />
                                    <DashboardRouter />
                                </>
                            </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
                                <>
                                    <Navbar />
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
