import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const FacultyDashboard = ({ theme }) => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'analytics'

    const getUserName = () => {
        if (!currentUser) return 'Faculty';
        if (currentUser.name) return currentUser.name;
        const namePart = currentUser.email?.split('@')[0];
        return namePart ? namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase() : 'Faculty';
    };

    const statusOptions = [
        { value: 'allocated', label: 'Allocated' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'resolved', label: 'Resolved' }
    ];

    const statusColors = {
        allocated: '#2563eb',
        ongoing: '#7c3aed',
        resolved: '#059669',
        pending: '#dc2626'
    };

    const statusLabels = {
        allocated: 'Allocated',
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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const view = params.get('view');
        if (view === 'analytics') {
            setActiveView('analytics');
        } else {
            setActiveView('dashboard');
        }
    }, [location.search]);

    const toggleExpand = (id) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            const c = cases.find(c => c.id === id);
            setEditData({
                status: c.status || 'allocated',
                meetingTimeSlot: c.meetingTimeSlot || '',
                meetingMode: c.meetingMode || 'offline',
                meetingVenue: c.meetingVenue || ''
            });
        }
    };

    const handleSave = async (feedbackId) => {
        const targetCase = cases.find(c => c.id === feedbackId);
        
        // Automation: If time slot and venue are provided, force status to 'ongoing'
        let finalData = { ...editData };
        if (editData.meetingTimeSlot && editData.meetingVenue) {
            finalData.status = 'ongoing';
        }

        // Validation for scheduling
        if (targetCase && (!targetCase.status || targetCase.status === 'allocated')) {
            if (!editData.meetingTimeSlot || !editData.meetingVenue) {
                // If they tried to change status to ongoing/resolved without details, or just didn't provide details
                if (editData.status === 'ongoing' || editData.status === 'resolved') {
                    setMessage({ text: 'Please provide meeting time and venue to schedule counselling.', type: 'error' });
                    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
                    return;
                }
            }
        }

        setSaving(feedbackId);
        try {
            await apiClient(`/faculty/update-case/${feedbackId}`, {
                method: 'PATCH',
                body: JSON.stringify(finalData)
            });
            setMessage({ text: 'Case updated successfully and moved to Ongoing!', type: 'success' });
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
        needsScheduling: cases.filter(c => (c.status === 'allocated' || !c.status) && !c.meetingTimeSlot).length,
        ongoing: cases.filter(c => c.status === 'ongoing').length,
        resolved: cases.filter(c => c.status === 'resolved').length
    };

    // Emotion Chart Data
    const emotionChartData = useMemo(() => {
        const counts = { Happy: 0, Stressed: 0, Anxious: 0, Neutral: 0, Sad: 0 };
        cases.forEach(c => {
            if (counts[c.emotion] !== undefined) {
                counts[c.emotion]++;
            } else if (c.emotion) {
                counts.Neutral++;
            }
        });

        return {
            labels: ['Happy', 'Stressed', 'Anxious', 'Neutral', 'Sad'],
            datasets: [
                {
                    label: 'Student Count',
                    data: [counts.Happy, counts.Stressed, counts.Anxious, counts.Neutral, counts.Sad],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.4)',  // Happy (Emerald Green)
                        'rgba(244, 63, 94, 0.4)',  // Stressed (Rose Red)
                        'rgba(245, 158, 11, 0.4)',  // Anxious (Amber Orange)
                        'rgba(100, 116, 139, 0.4)',  // Neutral (Slate Grey)
                        'rgba(59, 130, 246, 0.4)'   // Sad (Blue)
                    ],
                    borderColor: [
                        '#10b981',
                        '#f43f5e',
                        '#f59e0b',
                        '#64748b',
                        '#3b82f6'
                    ],
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.6,
                }
            ],
            counts: counts
        };
    }, [cases]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                enabled: true
            },
            datalabels: {
                anchor: 'end',
                align: 'top',
                color: theme === 'dark' ? '#e2e8f0' : '#475569',
                font: {
                    weight: '800',
                    size: 14
                },
                formatter: (value) => value > 0 ? value : ''
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Student Count',
                    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                    font: { weight: 'bold' }
                },
                ticks: { stepSize: 1 }
            },
            x: {
                title: {
                    display: true,
                    text: 'Emotion Categories',
                    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                    font: { weight: 'bold' }
                }
            }
        },
        animation: {
            duration: 1500,
            easing: 'easeOutQuart'
        }
    };

    const [hoveredStat, setHoveredStat] = useState(null);
    const [hoveredBreakdown, setHoveredBreakdown] = useState(null);

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                <p style={{ color: '#64748b' }}>Loading your allocated students...</p>
            </div>
        );
    }

    return (
        <div className="faculty-dashboard container" style={{ paddingTop: '20px', position: 'relative' }}>
            {/* Hamburger Button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="hamburger-btn"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="line"></div>
                    <div className="line"></div>
                    <div className="line"></div>
                </div>
            </button>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="sidebar-overlay"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="sidebar-container"
                    >
                        <div className="modal-header">
                            <h3 className="sidebar-title">Menu</h3>
                            <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn">×</button>
                        </div>

                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                            <div 
                                className={`sidebar-link ${activeView === 'dashboard' ? 'active' : ''}`} 
                                onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }}
                                style={{ cursor: 'pointer' }}
                            >
                                🎛️ Faculty Dashboard
                            </div>
                            <div 
                                className={`sidebar-link ${activeView === 'analytics' ? 'active' : ''}`} 
                                onClick={() => { setActiveView('analytics'); setIsSidebarOpen(false); }}
                                style={{ cursor: 'pointer' }}
                            >
                                📊 Student Emotional Overview
                            </div>
                            <Link to="/counselling-management" className="sidebar-link" onClick={() => setIsSidebarOpen(false)}>
                                📒 Counselling Management
                            </Link>
                        </nav>

                        <div className="sidebar-footer">
                            <div className="sidebar-user-info">
                                <div className="user-avatar">
                                    {getUserName().charAt(0)}
                                </div>
                                <div className="user-details">
                                    <span className="user-name">{getUserName()}</span>
                                    <span className="user-role">Faculty Member</span>
                                </div>
                                <div className="sidebar-logout-arrow" onClick={logout} title="Logout">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                {[
                    { label: 'Total Allocated', value: stats.total, color: '#2563eb', icon: '📋' },
                    { label: 'Needs Scheduling', value: stats.needsScheduling, color: '#d97706', icon: '📅' },
                    { label: 'Ongoing', value: stats.ongoing, color: '#7c3aed', icon: '🔄' },
                    { label: 'Resolved', value: stats.resolved, color: '#10b981', icon: '✅' }
                ].map((s, i) => (
                    <div 
                        key={i} 
                        onMouseEnter={() => setHoveredStat(i)}
                        onMouseLeave={() => setHoveredStat(null)}
                        style={{
                            background: 'var(--card-bg)',
                            borderRadius: '10px',
                            padding: '16px 20px',
                            boxShadow: hoveredStat === i ? 'var(--shadow-lg)' : 'var(--shadow-premium)',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: hoveredStat === i ? 'translateY(-4px)' : 'translateY(0)',
                            cursor: 'default'
                        }}
                    >
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>{s.label}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-slate)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ 
                                backgroundColor: hoveredStat === i ? s.color : `${s.color}15`, 
                                padding: '8px', 
                                borderRadius: '8px', 
                                fontSize: '1.2rem',
                                color: hoveredStat === i ? '#fff' : s.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s'
                            }}>{s.icon}</span>
                            {s.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Consolidated Student Cases Card */}
            {activeView === 'dashboard' && (
                <div className="card" style={{ boxShadow: 'var(--shadow-premium)', marginBottom: '30px' }}>
                    <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px', color: 'var(--primary-slate)' }}>
                        Allocated Students
                    </h2>

                    {[
                        { id: 'allocated', title: 'Allocated Students', list: cases.filter(c => !c.status || c.status === 'allocated'), color: '#2563eb' },
                        { id: 'ongoing', title: 'Ongoing Students', list: cases.filter(c => c.status === 'ongoing'), color: '#7c3aed' },
                        { id: 'resolved', title: 'Resolved Students', list: cases.filter(c => c.status === 'resolved'), color: '#059669' }
                    ].map((section, sectionIdx) => (
                        <div key={section.id} style={{ marginBottom: sectionIdx < 2 ? '25px' : '0' }}>
                            <h3 style={{ 
                                fontSize: '1.1rem', 
                                color: 'var(--text-main)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px',
                                marginBottom: '15px',
                                fontWeight: 600
                            }}>
                                <span style={{ color: section.color, fontSize: '1.5rem' }}>•</span>
                                {section.title} ({section.list.length})
                            </h3>

                            {section.list.length === 0 ? (
                                <div style={{ padding: '10px 20px', borderLeft: '1px solid var(--border-color)', marginLeft: '8px' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                                        No {section.title.toLowerCase()} list.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ marginLeft: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                                    {section.list.map(c => {
                                        const isLocked = !!(c.meetingTimeSlot && c.meetingVenue && c.status && c.status !== 'allocated');
                                        const isResolved = c.status === 'resolved';

                                        let availableStatuses = [];
                                        if (section.id === 'allocated') {
                                            availableStatuses = statusOptions.filter(opt => ['allocated', 'ongoing'].includes(opt.value));
                                        } else if (section.id === 'ongoing') {
                                            availableStatuses = statusOptions.filter(opt => ['ongoing', 'resolved'].includes(opt.value));
                                        } else {
                                            availableStatuses = statusOptions.filter(opt => opt.value === 'resolved');
                                        }

                                        return (
                                            <div key={c.id} style={{
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '10px',
                                                marginBottom: '12px',
                                                overflow: 'hidden',
                                                transition: 'box-shadow 0.2s',
                                                boxShadow: expandedId === c.id ? 'var(--shadow-md)' : 'none',
                                                backgroundColor: 'var(--card-bg)'
                                            }}>
                                                {/* Row Header */}
                                                <div
                                                    onClick={() => toggleExpand(c.id)}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                                        alignItems: 'center',
                                                        gap: '15px',
                                                        padding: '14px 20px',
                                                        cursor: 'pointer',
                                                        backgroundColor: expandedId === c.id ? 'var(--bg-color)' : 'var(--card-bg)',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <div>
                                                        <strong style={{ color: 'var(--text-main)' }}>{c.studentName}</strong>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.studentDetails?.regno || c.regno || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {c.studentDetails?.department || '—'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '1.2rem' }}>{getEmotionEmoji(c.emotion)}</span>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.emotion}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{
                                                            fontSize: '0.85rem',
                                                            color: statusColors[c.status || 'allocated'],
                                                            fontWeight: 600
                                                        }}>
                                                            {statusLabels[c.status || 'allocated']}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', transform: expandedId === c.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', textAlign: 'right' }}>
                                                        ▼
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {expandedId === c.id && (
                                                    <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', animation: 'fadeIn 0.3s ease-out' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                                                            {/* Student Details */}
                                                            <div>
                                                                <h4 style={{ color: 'var(--primary-slate)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
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
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                                                        <div><strong>Name:</strong> {c.studentName}</div>
                                                                        <div><strong>Email:</strong> {c.studentEmail}</div>
                                                                    </div>
                                                                )}

                                                                <h4 style={{ color: 'var(--primary-slate)', marginTop: '20px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                                                                    💬 Feedback Info
                                                                </h4>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                                                    <div><strong>Emotion:</strong> {getEmotionEmoji(c.emotion)} {c.emotion}</div>
                                                                        <div><strong>Intensity:</strong> {c.emotion_intensity}/5</div>
                                                                        <div><strong>Impact Score:</strong> {c.life_impact_score || '—'}/5</div>
                                                                        <div style={{ gridColumn: 'span 2' }}>
                                                                            <strong>Primary Cause:</strong> {c.emotion_domain || c.reason || '—'}
                                                                        </div>
                                                                        {c.emotion_triggers && c.emotion_triggers.length > 0 && (
                                                                            <div style={{ gridColumn: 'span 2' }}>
                                                                                <strong>Triggers:</strong> {Array.isArray(c.emotion_triggers) ? c.emotion_triggers.join(', ') : c.emotion_triggers}
                                                                            </div>
                                                                        )}
                                                                        <div><strong>Duration:</strong> {c.emotion_duration || '—'}</div>
                                                                        <div><strong>Date:</strong> {c.date}</div>
                                                                        <div><strong>Help Requested:</strong> {c.helpRequested ? '✅ Yes' : 'No'}</div>
                                                                        <div style={{ gridColumn: 'span 2' }}><strong>Comment:</strong> {c.comment || <em>No comment</em>}</div>
                                                                    </div>
                                                            </div>

                                                            {/* Action Form */}
                                                            <div>
                                                                <h4 style={{ color: 'var(--primary-slate)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                                                                    ⚙️ Case Management
                                                                </h4>

                                                                <div style={{ marginBottom: '16px' }}>
                                                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                                        Status
                                                                    </label>
                                                                    <select
                                                                        value={editData.status || ''}
                                                                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                                                                        disabled={isResolved}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px 12px',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--border-color)',
                                                                            fontSize: '0.95rem',
                                                                            backgroundColor: isResolved ? 'var(--bg-color)' : 'var(--card-bg)',
                                                                            color: 'var(--text-main)',
                                                                            cursor: isResolved ? 'not-allowed' : 'pointer'
                                                                        }}
                                                                    >
                                                                        {availableStatuses.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                <div style={{ marginBottom: '16px' }}>
                                                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                                        Session Mode
                                                                    </label>
                                                                    <select
                                                                        value={editData.meetingMode || 'offline'}
                                                                        onChange={(e) => setEditData(prev => ({ ...prev, meetingMode: e.target.value }))}
                                                                        disabled={isResolved}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px 12px',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--border-color)',
                                                                            fontSize: '0.95rem',
                                                                            backgroundColor: isResolved ? 'var(--bg-color)' : 'var(--card-bg)',
                                                                            color: 'var(--text-main)',
                                                                            cursor: isResolved ? 'not-allowed' : 'pointer'
                                                                        }}
                                                                    >
                                                                        <option value="offline">Offline (In-Person)</option>
                                                                        <option value="online">Online (Video Call)</option>
                                                                    </select>
                                                                </div>

                                                                <div style={{ marginBottom: '16px' }}>
                                                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                                        Meeting Time Slot
                                                                    </label>
                                                                    <input
                                                                        type="datetime-local"
                                                                        min={new Date().toISOString().slice(0, 16)}
                                                                        value={editData.meetingTimeSlot || ''}
                                                                        onChange={(e) => setEditData(prev => ({ ...prev, meetingTimeSlot: e.target.value }))}
                                                                        disabled={isResolved}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px 12px',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--border-color)',
                                                                            fontSize: '0.95rem',
                                                                            boxSizing: 'border-box',
                                                                            backgroundColor: isResolved ? 'var(--bg-color)' : 'var(--card-bg)',
                                                                            color: 'var(--text-main)',
                                                                            cursor: isResolved ? 'not-allowed' : 'text'
                                                                        }}
                                                                    />
                                                                </div>

                                                                <div style={{ marginBottom: '16px' }}>
                                                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                                        {editData.meetingMode === 'online' ? 'Meet Link' : 'Meeting Venue'}
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder={editData.meetingMode === 'online' ? "Paste Meet/Zoom link here" : "e.g. Room 302, Main Block"}
                                                                        value={editData.meetingVenue || ''}
                                                                        onChange={(e) => setEditData(prev => ({ ...prev, meetingVenue: e.target.value }))}
                                                                        disabled={isResolved}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px 12px',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--border-color)',
                                                                            fontSize: '0.95rem',
                                                                            boxSizing: 'border-box',
                                                                            backgroundColor: isResolved ? 'var(--bg-color)' : 'var(--card-bg)',
                                                                            color: 'var(--text-main)',
                                                                            cursor: isResolved ? 'not-allowed' : 'text'
                                                                        }}
                                                                    />
                                                                </div>


                                                                {/* Show current meeting info if set */}
                                                                {(c.meetingTimeSlot || c.meetingVenue) && (
                                                                    <div style={{
                                                                        backgroundColor: 'var(--bg-color)',
                                                                        padding: '10px 14px',
                                                                        borderRadius: '8px',
                                                                        marginBottom: '16px',
                                                                        fontSize: '0.85rem',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-main)'
                                                                    }}>
                                                                        <strong>Current Schedule:</strong><br />
                                                                        {c.meetingTimeSlot && <span>🕐 {new Date(c.meetingTimeSlot).toLocaleString()}<br /></span>}
                                                                        {c.meetingMode && <span>📱 Mode: {c.meetingMode.charAt(0).toUpperCase() + c.meetingMode.slice(1)}<br /></span>}
                                                                        {c.meetingVenue && <span>{c.meetingMode === 'online' ? '🔗 Link: ' : '📍 Venue: '}{c.meetingVenue}</span>}
                                                                    </div>
                                                                )}

                                                                {!isResolved && (
                                                                    <button
                                                                        onClick={() => handleSave(c.id)}
                                                                        disabled={saving === c.id}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '12px',
                                                                            backgroundColor: 'var(--primary-slate)',
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
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Student Emotion Overview Card */}
            {activeView === 'analytics' && (
                <div className="card" style={{ boxShadow: 'var(--shadow-premium)', marginBottom: '30px', padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-color)' }}>
                        <h2 style={{ color: 'var(--primary-slate)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>📊</span> Student Emotion Overview
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, backgroundColor: 'var(--card-bg)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Live Analytics</span>
                    </div>
                    
                    {cases.length > 0 ? (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                            gap: '0', 
                            minHeight: '400px'
                        }}>
                            {/* Left Side: Chart */}
                            <div style={{ padding: '30px 40px', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ height: '350px', position: 'relative' }}>
                                    <Bar data={emotionChartData} options={{
                                        ...chartOptions,
                                        scales: {
                                            ...chartOptions.scales,
                                            y: {
                                                ...chartOptions.scales.y,
                                                grace: '20%',
                                                grid: { display: false },
                                                ticks: { ...chartOptions.scales.y.ticks, color: theme === 'dark' ? '#e2e8f0' : '#94a3b8' }
                                            },
                                            x: {
                                                ...chartOptions.scales.x,
                                                grid: { display: false },
                                                ticks: { color: theme === 'dark' ? '#e2e8f0' : '#64748b', font: { weight: '600' } }
                                            }
                                        }
                                    }} />
                                </div>
                            </div>

                            {/* Right Side: Breakdown List */}
                            <div style={{ padding: '30px 25px', backgroundColor: 'var(--card-bg)' }}>
                                <h3 style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-secondary)', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px',
                                    marginBottom: '25px',
                                    paddingBottom: '10px',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    Breakdown
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        { emotion: 'Happy', color: 'rgba(16, 185, 129, 0.6)' },
                                        { emotion: 'Stressed', color: 'rgba(244, 63, 94, 0.6)' },
                                        { emotion: 'Anxious', color: 'rgba(245, 158, 11, 0.6)' },
                                        { emotion: 'Neutral', color: 'rgba(100, 116, 139, 0.6)' },
                                        { emotion: 'Sad', color: 'rgba(59, 130, 246, 0.6)' }
                                    ].map((item) => {
                                        const count = emotionChartData.counts[item.emotion] || 0;
                                        const isHovered = hoveredBreakdown === item.emotion;
                                        return (
                                            <div 
                                                key={item.emotion} 
                                                onMouseEnter={() => setHoveredBreakdown(item.emotion)}
                                                onMouseLeave={() => setHoveredBreakdown(null)}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    transition: 'all 0.25s ease',
                                                    backgroundColor: isHovered ? 'var(--bg-color)' : 'transparent',
                                                    transform: isHovered ? 'translateX(5px)' : 'translateX(0)',
                                                    cursor: 'default'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ 
                                                        width: '4px', 
                                                        height: '24px', 
                                                        backgroundColor: item.color, 
                                                        borderRadius: '2px',
                                                        transition: 'height 0.3s',
                                                        height: isHovered ? '32px' : '24px'
                                                    }}></div>
                                                    <span style={{ 
                                                        fontWeight: 600, 
                                                        color: isHovered ? item.color : 'var(--text-main)', 
                                                        fontSize: '0.9rem',
                                                        transition: 'color 0.3s'
                                                    }}>{item.emotion}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ 
                                                        fontWeight: 800, 
                                                        color: 'var(--text-main)', 
                                                        fontSize: isHovered ? '1.25rem' : '1.1rem',
                                                        transition: 'all 0.3s'
                                                    }}>{count}</span>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Count</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '60px 0', textAlign: 'center', backgroundColor: 'var(--card-bg)' }}>
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>📈</span>
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                No feedback data available yet.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FacultyDashboard;
