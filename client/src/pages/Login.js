import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (role) => {
        setError('');

        // Validation: Required fields
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password.');
            return;
        }

        setIsLoading(true);

        try {
            const user = await login(email, password, role);

            // Check if returned role matches requested role
            // Note: Currently backend enforces this via 401 if mismatch, 
            // but double check here for safety and redirection.
            if (user.role === role) {
                if (role === 'admin') {
                    navigate('/'); // Protected route handles admin dashboard
                } else {
                    navigate('/'); // Protected route handles student dashboard
                }
            } else {
                // Fallback if backend didn't catch mismatch (though it should)
                await logout();
                setError('You are not authorized to access this role.');
            }

        } catch (err) {
            console.error(err);
            // Customize error message based on requirement
            // If backend sends specific message, use it. 
            // Otherwise use generic "Invalid credentials"
            if (err.message === "Invalid credentials") {
                setError("Invalid credentials. Please try again.");
            } else {
                setError(err.message || "An error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container login-page-container">
            <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Login Portal</h1>
            <div className="login-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="login-card" style={{ maxWidth: '400px', width: '100%' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Welcome Back</h2>

                    {error && <p className="error-msg" style={{ textAlign: 'center' }}>{error}</p>}

                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => handleLogin('student')}
                                disabled={isLoading}
                                style={{ flex: 1, backgroundColor: '#3498db' }}
                            >
                                {isLoading ? 'Logging in...' : 'Login as Student'}
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => handleLogin('admin')}
                                disabled={isLoading}
                                style={{ flex: 1, backgroundColor: '#2c3e50' }}
                            >
                                {isLoading ? 'Logging in...' : 'Login as Admin'}
                            </button>
                        </div>
                    </form>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <p>Don't have an account?</p>
                        <Link to="/register" className="register-link">Register here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
