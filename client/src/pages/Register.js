import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useParams } from 'react-router-dom';

const Register = () => {
    const { role } = useParams(); // Gets 'student' or 'faculty' from URL
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const roleLabel = role === 'faculty' ? 'Faculty' : 'Student';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        try {
            await register(email, password, role || 'student', name);
            navigate('/login');
        } catch (err) {
            setError('Failed to create an account: ' + err.message);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '500px', marginTop: '50px' }}>
            <div className="card">
                <h2 style={{ textAlign: 'center' }}>{roleLabel} Registration</h2>
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                        />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                        />
                    </div>
                    <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }}>Register as {roleLabel}</button>
                </form>

                <div className="register-section" style={{ border: 'none', borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                    <p style={{ textAlign: 'center', margin: 0 }}>
                        Already have an account? <Link to="/login" style={{ color: '#4b6159', fontWeight: 'bold' }}>Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
