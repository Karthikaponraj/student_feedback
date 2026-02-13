import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const LoginPortal = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showRoleButtons, setShowRoleButtons] = useState(false);
    const [showRegisterOptions, setShowRegisterOptions] = useState(false);
    const { login, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (role) => {
        setError('');

        // Validation
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password.');
            return;
        }

        setIsLoading(true);

        try {
            const user = await login(email, password, role);

            // Double check role match (though backend handles it)
            if (user.role === role) {
                navigate('/');
            } else {
                await logout();
                setError('You are not authorized for this role.');
            }

        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes("Invalid credentials")) {
                setError("Invalid credentials. Please try again.");
            } else {
                setError(err.message || "An error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-portal-container">
            <header className="login-page-header">
                <h1>Student Emotional Feedback System</h1>
                <p>Role-based secure login portal</p>
            </header>
            <div className="login-portal-card">
                <div className="login-icon-header">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </div>

                <h2 className="portal-login-title">Portal Login</h2>

                {error && <div className="error-message" style={{ width: '100%' }}>{error}</div>}

                <form onSubmit={(e) => e.preventDefault()} style={{ width: '100%' }}>
                    <div className="underline-input-group">
                        <svg viewBox="0 0 24 24">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Email ID"
                        />
                    </div>

                    <div className="underline-input-group">
                        <svg viewBox="0 0 24 24">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                        />
                    </div>

                    <div className="login-options-row">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>Remember me</span>
                        </label>
                        <Link to="/forgot-password" color="#4b6159" className="forgot-password">Forgot Password?</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {!showRoleButtons ? (
                            <button
                                type="button"
                                className="login-btn-action"
                                onClick={() => {
                                    if (!email.trim() || !password.trim()) {
                                        setError('Please enter both email and password.');
                                        return;
                                    }
                                    setError('');
                                    setShowRoleButtons(true);
                                }}
                            >
                                Login
                            </button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInDown 0.4s ease-out' }}>
                                <button
                                    type="button"
                                    className="login-btn-action"
                                    onClick={() => handleLogin('student')}
                                    disabled={isLoading}
                                >
                                    {isLoading ? '...' : 'Login as Student'}
                                </button>
                                <button
                                    type="button"
                                    className="login-btn-action"
                                    onClick={() => handleLogin('admin')}
                                    disabled={isLoading}
                                >
                                    {isLoading ? '...' : 'Login as Admin'}
                                </button>
                                <button
                                    type="button"
                                    className="login-btn-action"
                                    onClick={() => handleLogin('faculty')}
                                    disabled={isLoading}
                                >
                                    {isLoading ? '...' : 'Login as Faculty'}
                                </button>
                            </div>
                        )}
                    </div>
                </form>

                <div className="register-section">
                    {!showRegisterOptions ? (
                        <div>
                            <span style={{ opacity: 0.8 }}>Don't have an account? </span>
                            <span
                                onClick={() => setShowRegisterOptions(true)}
                                className="register-link-trigger"
                            >
                                Register
                            </span>
                        </div>
                    ) : (
                        <div className="register-options-container">
                            <p className="register-as-text">Register as:</p>
                            <div className="register-links-row">
                                <Link to="/register/student" className="register-link">Student</Link>
                                <span className="separator">|</span>
                                <Link to="/register/faculty" className="register-link">Faculty</Link>
                            </div>
                            <button
                                onClick={() => setShowRegisterOptions(false)}
                                className="back-btn-minimal"
                            >
                                Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPortal;
