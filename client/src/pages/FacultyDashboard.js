import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

const FacultyDashboard = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });

    const statusOptions = [
        { value: 'allocated', label: 'Allocated' },
        { value: 'yet_to_meet', label: 'Yet to Meet' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'resolved', label: 'Resolved' }
    ];

    const statusColors = {
        allocated: '#2563eb',
        yet_to_meet: '#d97706',
        ongoing: '#7c3aed',
        resolved: '#059669',
        pending: '#dc2626'
    };

    const statusLabels = {
        allocated: 'Allocated',
        yet_to_meet: 'Yet to Meet',
        ongoing: 'Ongoing',
        resolved: 'Resolved',
        pending: 'Pending'
    };

    const fetchCases = useCallback(async () => {
        try {
            const data = await apiClient('/faculty/my-students');
            setCases(data);
        } catch (error) {
            console.error('Error fetching cases:', error);
            setMessage({ text: 'Error loading your allocated students.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    const toggleExpand = (id) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            const c = cases.find(c => c.id === id);
            setEditData({
                status: c.status || 'allocated',
                meetingTimeSlot: c.meetingTimeSlot || '',
                meetingVenue: c.meetingVenue || ''
            });
        }
    };

    const handleSave = async (feedbackId) => {
        setSaving(feedbackId);
        try {
            await apiClient(`/faculty/update-case/${feedbackId}`, {
                method: 'PATCH',
                body: JSON.stringify(editData)
            });
            setMessage({ text: 'Case updated successfully!', type: 'success' });
            fetchCases();
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error updating case:', error);
            setMessage({ text: 'Error updating case. Please try again.', type: 'error' });
        } finally {
            setSaving(null);
        }
    };

    const getEmotionEmoji = (emotion) => {
        switch (emotion) {
            case 'Happy': return '😊';
            case 'Stressed': return '😫';
            case 'Anxious': return '😰';
            case 'Sad': return '😢';
            case 'Neutral': return '😐';
            default: return '😐';
        }
    };

    const getEmotionColor = (emotion) => {
        switch (emotion) {
            case 'Happy': return '#50c878';
            case 'Stressed': return '#ff6b6b';
            case 'Anxious': return '#f1c40f';
            case 'Sad': return '#3498db';
            default: return '#95a5a6';
        }
    };

    // Stats
    const stats = {
        total: cases.length,
        yetToMeet: cases.filter(c => c.status === 'allocated' || c.status === 'yet_to_meet').length,
        ongoing: cases.filter(c => c.status === 'ongoing').length,
        resolved: cases.filter(c => c.status === 'resolved').length
    };

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                <p style={{ color: '#64748b' }}>Loading your allocated students...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '20px' }}>
            {/* Message Banner */}
            {message.text && (
                <div style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
                    fontWeight: 600,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {message.text}
                </div>
            )}

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '30px' }}>
                {[
                    { label: 'Total Allocated', value: stats.total, color: '#4b6159', icon: '📋' },
                    { label: 'Yet to Meet', value: stats.yetToMeet, color: '#d97706', icon: '🕐' },
                    { label: 'Ongoing', value: stats.ongoing, color: '#7c3aed', icon: '🔄' },
                    { label: 'Resolved', value: stats.resolved, color: '#059669', icon: '✅' }
                ].map((s, i) => (
                    <div key={i} style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '20px',
                        borderLeft: `5px solid ${s.color}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, marginTop: '6px' }}>
                            {s.icon} {s.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Student Cases */}
            <div className="card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px', color: '#4b6159' }}>
                    Allocated Students
                </h2>

                {cases.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No students have been allocated to you yet.</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Students will appear here once the admin assigns them to you.</p>
                    </div>
                ) : (
                    <div>
                        {cases.map(c => (
                            <div key={c.id} style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                marginBottom: '12px',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s',
                                boxShadow: expandedId === c.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                            }}>
                                {/* Row Header */}
                                <div
                                    onClick={() => toggleExpand(c.id)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                                        alignItems: 'center',
                                        padding: '14px 20px',
                                        cursor: 'pointer',
                                        backgroundColor: expandedId === c.id ? '#f8fafc' : '#fff',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div>
                                        <strong style={{ color: '#1e293b' }}>{c.studentName}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.studentEmail}</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            {c.studentDetails?.department || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            backgroundColor: `${getEmotionColor(c.emotion)}20`,
                                            color: getEmotionColor(c.emotion),
                                            fontWeight: 700,
                                            fontSize: '0.85rem'
                                        }}>
                                            {getEmotionEmoji(c.emotion)} {c.emotion}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            backgroundColor: `${statusColors[c.status] || '#6b7280'}15`,
                                            color: statusColors[c.status] || '#6b7280',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            border: `1px solid ${statusColors[c.status] || '#6b7280'}40`
                                        }}>
                                            {statusLabels[c.status] || c.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', color: '#94a3b8', transform: expandedId === c.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
                                        ▼
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === c.id && (
                                    <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', animation: 'fadeIn 0.3s ease-out' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                            {/* Student Details */}
                                            <div>
                                                <h4 style={{ color: '#4b6159', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                                    📋 Student Details
                                                </h4>
                                                {c.studentDetails ? (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                                        <div><strong>Name:</strong> {c.studentDetails.name}</div>
                                                        <div><strong>Reg No:</strong> {c.studentDetails.regno}</div>
                                                        <div><strong>Department:</strong> {c.studentDetails.department}</div>
                                                        <div><strong>Batch:</strong> {c.studentDetails.batch}</div>
                                                        <div><strong>Email:</strong> {c.studentDetails.email}</div>
                                                        <div><strong>Mobile:</strong> {c.studentDetails.mobile}</div>
                                                        <div style={{ gridColumn: 'span 2' }}><strong>Place:</strong> {c.studentDetails.place}</div>
                                                    </div>
                                                ) : (
                                                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Student details not submitted yet.</p>
                                                )}

                                                <h4 style={{ color: '#4b6159', marginTop: '20px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                                    💬 Feedback Info
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                                    <div><strong>Emotion:</strong> {getEmotionEmoji(c.emotion)} {c.emotion}</div>
                                                    <div><strong>Intensity:</strong> {c.emotion_intensity}/5</div>
                                                    <div><strong>Date:</strong> {c.date}</div>
                                                    <div><strong>Help Requested:</strong> {c.helpRequested ? '✅ Yes' : 'No'}</div>
                                                    <div style={{ gridColumn: 'span 2' }}><strong>Comment:</strong> {c.comment || <em>No comment</em>}</div>
                                                </div>
                                            </div>

                                            {/* Action Form */}
                                            <div>
                                                <h4 style={{ color: '#4b6159', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                                    ⚙️ Case Management
                                                </h4>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#334155', fontSize: '0.9rem' }}>
                                                        Status
                                                    </label>
                                                    <select
                                                        value={editData.status || ''}
                                                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #cbd5e1',
                                                            fontSize: '0.95rem',
                                                            backgroundColor: '#fff'
                                                        }}
                                                    >
                                                        {statusOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#334155', fontSize: '0.9rem' }}>
                                                        Meeting Time Slot
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={editData.meetingTimeSlot || ''}
                                                        onChange={(e) => setEditData(prev => ({ ...prev, meetingTimeSlot: e.target.value }))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #cbd5e1',
                                                            fontSize: '0.95rem',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#334155', fontSize: '0.9rem' }}>
                                                        Meeting Venue
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Room 302, Main Block"
                                                        value={editData.meetingVenue || ''}
                                                        onChange={(e) => setEditData(prev => ({ ...prev, meetingVenue: e.target.value }))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #cbd5e1',
                                                            fontSize: '0.95rem',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </div>

                                                {/* Show current meeting info if set */}
                                                {(c.meetingTimeSlot || c.meetingVenue) && (
                                                    <div style={{
                                                        backgroundColor: '#eff6ff',
                                                        padding: '10px 14px',
                                                        borderRadius: '8px',
                                                        marginBottom: '16px',
                                                        fontSize: '0.85rem',
                                                        border: '1px solid #bfdbfe'
                                                    }}>
                                                        <strong>Current Schedule:</strong><br />
                                                        {c.meetingTimeSlot && <span>🕐 {new Date(c.meetingTimeSlot).toLocaleString()}<br /></span>}
                                                        {c.meetingVenue && <span>📍 {c.meetingVenue}</span>}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleSave(c.id)}
                                                    disabled={saving === c.id}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        backgroundColor: '#4b6159',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '1rem',
                                                        fontWeight: 700,
                                                        cursor: saving === c.id ? 'not-allowed' : 'pointer',
                                                        opacity: saving === c.id ? 0.7 : 1,
                                                        transition: 'all 0.2s',
                                                        letterSpacing: '0.5px'
                                                    }}
                                                >
                                                    {saving === c.id ? 'Saving...' : '💾 Save Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyDashboard;
