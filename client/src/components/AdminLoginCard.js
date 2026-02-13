import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const AdminLoginCard = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // Login with Backend
            const { role } = await login(email, password, 'admin');

            // Check Role
            if (role === 'admin') {
                navigate('/');
            } else {
                await logout();
                setError('Access Denied. Admin only');
            }
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="login-card">
            <h3>Admin Login</h3>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label>Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="admin@school.edu"
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn">Login as Admin</button>
            </form>

            <div className="register-section">
                <span className="text-muted">Don't have an account?</span>
                <Link to="/register">Register</Link>
            </div>
        </div>
    );
};

export default AdminLoginCard;
