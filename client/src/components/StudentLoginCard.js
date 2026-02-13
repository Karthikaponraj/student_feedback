import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const StudentLoginCard = () => {
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
            const { role } = await login(email, password, 'student');

            // Check Role
            if (role === 'student' || role === 'faculty') {
                navigate('/');
            } else {
                await logout();
                setError('Please use Admin Login');
            }
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="login-card">
            <h3>Student Login</h3>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label>Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="student@example.com"
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
                <button type="submit" className="btn">Login as Student</button>
            </form>

            <div className="register-section">
                <span className="text-muted">Don't have an account?</span>
                <Link to="/register">Register</Link>
            </div>
        </div>
    );
};

export default StudentLoginCard;
