import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/apiClient';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const response = await apiClient('/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            setMessage(response.message || 'OTP sent to your email');
            setStep(2);
        } catch (err) {
            setError(err.message || 'Error sending OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            await apiClient('/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email, otp })
            });
            setMessage('OTP verified. Please enter your new password.');
            setStep(3);
        } catch (err) {
            setError(err.message || 'Invalid or expired OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            await apiClient('/reset-password', {
                method: 'POST',
                body: JSON.stringify({ email, otp, newPassword })
            });
            setMessage('Password updated successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.message || 'Error updating password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-portal-container">
            <header className="login-page-header">
                <h1>Reset Your Password</h1>
                <p>Follow the steps to recover your account</p>
            </header>

            <div className="login-portal-card">
                <div className="login-icon-header">
                    <svg viewBox="0 0 24 24">
                        <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                    </svg>
                </div>

                <h2 className="portal-login-title">Step {step}: {step === 1 ? 'Email' : step === 2 ? 'OTP' : 'New Password'}</h2>

                {error && <div className="error-message" style={{ width: '100%' }}>{error}</div>}
                {message && <div style={{ width: '100%', padding: '12px', borderRadius: '6px', marginBottom: '20px', textAlign: 'center', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>{message}</div>}

                {step === 1 && (
                    <form onSubmit={handleSendOTP} style={{ width: '100%' }}>
                        <div className="underline-input-group">
                            <svg viewBox="0 0 24 24">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Registered Email ID"
                            />
                        </div>
                        <button type="submit" className="login-btn-action" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOTP} style={{ width: '100%' }}>
                        <div className="underline-input-group">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v4h-2zm0 6h2v2h-2z" />
                            </svg>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                placeholder="Enter 6-Digit OTP"
                                maxLength="6"
                            />
                        </div>
                        <button type="submit" className="login-btn-action" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#4b6159', textDecoration: 'underline', width: '100%', cursor: 'pointer', marginTop: '10px' }}>
                            Back to Email
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} style={{ width: '100%' }}>
                        <div className="underline-input-group">
                            <svg viewBox="0 0 24 24">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                            </svg>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="New Password"
                            />
                        </div>
                        <div className="underline-input-group">
                            <svg viewBox="0 0 24 24">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                            </svg>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm Password"
                            />
                        </div>
                        <button type="submit" className="login-btn-action" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}

                <div className="register-section" style={{ border: 'none', color: '#4b6159', marginTop: '20px' }}>
                    <Link to="/login" style={{ color: '#4b6159', textDecoration: 'underline', fontWeight: 'bold' }}>Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
