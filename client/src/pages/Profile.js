import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

const Profile = () => {
    const { currentUser, userRole, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [profileData, setProfileData] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || ''
    });

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null);

    useEffect(() => {
        if (currentUser) {
            setProfileData({
                name: currentUser.name || '',
                email: currentUser.email || ''
            });

            // Fetch student details if user is a student to get regno
            if (userRole === 'student') {
                apiClient('/student-details/me')
                    .then(data => setStudentInfo(data))
                    .catch(err => console.error("Error fetching student details:", err));
            }
        }
    }, [currentUser, userRole]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!profileData.name || !profileData.email) {
            return setMessage({ text: "Name and email cannot be empty", type: 'error' });
        }

        setLoading(true);
        try {
            const data = await apiClient('/users/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            updateUser(data.user);
            setMessage({ text: "Profile updated successfully!", type: 'success' });
            setIsEditing(false);
        } catch (error) {
            setMessage({ text: error.message || "Failed to update profile", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            return setMessage({ text: "Passwords do not match", type: 'error' });
        }
        if (passwords.new.length < 6) {
            return setMessage({ text: "New password must be at least 6 characters", type: 'error' });
        }

        setLoading(true);
        try {
            await apiClient('/users/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword: passwords.current,
                    newPassword: passwords.new
                })
            });
            setMessage({ text: "Password changed successfully!", type: 'success' });
            setPasswords({ current: '', new: '', confirm: '' });
            setShowPasswordForm(false);
        } catch (error) {
            setMessage({ text: error.message || "Failed to change password", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '30px' }}>
            <h1 style={{ marginBottom: '30px', color: 'var(--primary-slate)', textAlign: 'center' }}>My Profile</h1>
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '5px',
                        lineHeight: 1,
                        borderRadius: '50%',
                        transition: 'background 0.2s',
                        zIndex: 10
                    }}
                    onMouseOver={(e) => e.target.style.background = 'var(--bg-color)'}
                    onMouseOut={(e) => e.target.style.background = 'none'}
                >
                    ×
                </button>
                <div style={{ textAlign: 'center', marginBottom: '35px', position: 'relative' }}>
                    <div className="profile-avatar">
                        {profileData.name ? profileData.name.charAt(0).toUpperCase() : (currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U')}
                    </div>

                    {!isEditing && (
                        <div className="profile-header-info">
                            <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: '800' }}>{currentUser?.name || 'User'}</h2>
                            <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '1.05rem' }}>{currentUser?.email}</p>
                        </div>
                    )}

                    <span className="role-badge">
                        {userRole === 'admin' ? '🛡️ Administrator' : userRole === 'faculty' ? '🎓 Faculty' : '👤 Student'}
                    </span>

                    {!showPasswordForm && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="edit-profile-action-btn"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Edit Profile</span>
                        </button>
                    )}
                </div>

                {message.text && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: message.type === 'success' ? 'var(--success-green)' : 'var(--danger-red)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        textAlign: 'center',
                        fontWeight: '500'
                    }}>
                        {message.text}
                    </div>
                )}

                {showPasswordForm ? (
                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>Update Security</h3>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                required
                                placeholder="Enter your current password"
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                required
                                placeholder="At least 6 characters"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                required
                                placeholder="Repeat new password"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                                {loading ? 'Updating...' : 'Save New Password'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowPasswordForm(false)}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Full Name</label>
                                <input
                                    type="text"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                    required
                                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Email</label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                    required
                                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleProfileUpdate}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                {loading ? 'Saving...' : 'Save Profile Changes'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsEditing(false)}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Email Address</label>
                                <div style={{ padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                                    {currentUser?.email}
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {userRole === 'student' ? 'Reg No' : userRole === 'faculty' ? 'Faculty ID' : 'Admin ID'}
                                </label>
                                <div style={{ padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                                    {userRole === 'student' ? (studentInfo?.regno || 'Loading...') : (currentUser?.id || currentUser?.uid)}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => setShowPasswordForm(true)}
                                style={{ flex: 1 }}
                            >
                                Change Password
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={logout}
                                style={{ flex: 1 }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
