import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import SummaryCard from '../components/SummaryCard';
import AssignMentorModal from '../components/AssignMentorModal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import FeedbackReports from './FeedbackReports';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);


const DetailedEmotionReasonAnalytics = ({ filteredFeedbacks, onShowStudents }) => {
    const [expandedEmotions, setExpandedEmotions] = useState({
        Happy: true,
        Stressed: true,
        Anxious: false,
        Neutral: false,
        Sad: false
    });

    const { emotionCounts, detailedCounts } = useMemo(() => {
        const counts = { Happy: 0, Stressed: 0, Anxious: 0, Neutral: 0, Sad: 0 };
        const detailed = {};

        filteredFeedbacks.forEach(item => {
            const emotion = item.emotion;
            if (counts[emotion] !== undefined) {
                counts[emotion]++;

                if (!detailed[emotion]) {
                    detailed[emotion] = { count: 0, domains: {} };
                }
                const d = detailed[emotion];
                d.count++;

                const reason = item.emotion_domain || 'Unspecified';
                if (!d.domains[reason]) {
                    d.domains[reason] = { count: 0, students: [] };
                }
                d.domains[reason].count++;
                
                // Track record for drill-down
                d.domains[reason].students.push({
                    name: item.studentName || 'Unknown',
                    id: item.regno || '—',
                    department: item.department || '—',
                    emotion: emotion,
                    reason: reason,
                    date: new Date(item.dateObj || item.date).toLocaleDateString()
                });
            }
        });
        return { emotionCounts: counts, detailedCounts: detailed };
    }, [filteredFeedbacks]);

    const handleExportExcel = () => {
        // Sheet 1: Emotion Summary
        const emotionSummary = Object.entries(emotionCounts).map(([emotion, count]) => ({
            Emotion: emotion,
            'Total Students': count
        }));

        // Sheet 2: Reason Summary
        const reasonSummary = [];
        Object.entries(detailedCounts).forEach(([emotion, eData]) => {
            Object.entries(eData.domains).forEach(([reason, rData]) => {
                reasonSummary.push({
                    Emotion: emotion,
                    Reason: reason,
                    'Student Count': rData.count
                });
            });
        });

        // Sheet 3: Student Details
        const studentDetails = [];
        Object.entries(detailedCounts).forEach(([emotion, eData]) => {
            Object.entries(eData.domains).forEach(([reason, rData]) => {
                rData.students.forEach(s => {
                    studentDetails.push({
                        'Student Name': s.name,
                        'Roll No': s.id,
                        Domain: s.department,
                        Emotion: emotion,
                        Reason: reason,
                        Date: s.date
                    });
                });
            });
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emotionSummary), 'Emotion Summary');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reasonSummary), 'Reason Summary');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentDetails), 'Student Details');
        XLSX.writeFile(wb, 'emotion_reason_analytics.xlsx');
    };

    return (
        <div className="card" style={{ marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-main)' }}>Emotion Reason Analytics</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>Progress visualization with student drill-down and reports.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn" onClick={handleExportExcel} style={{ 
                        width: 'auto', 
                        padding: '10px 20px', 
                        fontSize: '0.95rem', 
                        backgroundColor: 'var(--success-green)',
                        fontWeight: '700',
                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                    }}>
                        Export Reason Details (Excel)
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.keys(emotionCounts).map(emotion => {
                    const count = emotionCounts[emotion] || 0;
                    if (count === 0) return null;

                    const emotionStyles = {
                        Happy: { emoji: '😊', color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.1)' },
                        Stressed: { emoji: '😫', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.05)', border: 'rgba(244, 63, 94, 0.1)' },
                        Anxious: { emoji: '😰', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.1)' },
                        Neutral: { emoji: '😐', color: '#64748b', bg: 'rgba(100, 116, 139, 0.05)', border: 'rgba(100, 116, 139, 0.1)' },
                        Sad: { emoji: '😢', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.1)' }
                    };
                    const style = emotionStyles[emotion] || emotionStyles.Neutral;
                    const isOpen = expandedEmotions[emotion];
                    const detailed = detailedCounts[emotion] || { domains: {}, count: 0 };

                    return (
                        <div key={emotion} style={{
                            backgroundColor: 'var(--bg-color)',
                            border: `1px solid ${style.border}`,
                            borderRadius: '12px',
                            overflow: 'hidden',
                            transition: 'all 0.3s'
                        }}>
                            <div
                                onClick={() => setExpandedEmotions(prev => ({ ...prev, [emotion]: !prev[emotion] }))}
                                style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: style.bg
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{style.emoji}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1.1rem' }}>{emotion}</span>
                                    <span style={{ color: style.color, fontSize: '0.9rem', fontWeight: 600 }}>
                                        {count} Student{count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div style={{
                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s',
                                    color: style.color
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                            </div>

                            <div style={{
                                maxHeight: isOpen ? '1000px' : '0',
                                opacity: isOpen ? 1 : 0,
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason Distribution</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {Object.entries(detailed.domains).length > 0 ? (
                                            Object.entries(detailed.domains)
                                                .sort((a, b) => b[1].count - a[1].count)
                                                .map(([reason, reasonData]) => {
                                                    const percentage = Math.round((reasonData.count / count) * 100);
                                                    return (
                                                        <div key={reason} title="Click to view students" onClick={() => onShowStudents(reason, emotion, reasonData.students)} style={{ cursor: 'pointer' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                                                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{reason}</span>
                                                                <span style={{ color: 'var(--text-secondary)' }}>{percentage}% ({reasonData.count} Student{reasonData.count !== 1 ? 's' : ''})</span>
                                                            </div>
                                                            <div style={{ height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    width: `${percentage}%`,
                                                                    backgroundColor: style.color,
                                                                    borderRadius: '5px',
                                                                    transition: 'width 0.8s ease-out',
                                                                    boxShadow: `0 0 10px ${style.color}40`
                                                                }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        ) : (
                                            <div style={{ padding: '10px 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                No specific reasons provided.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [helpRequests, setHelpRequests] = useState([]);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
    const [studentDetailsList, setStudentDetailsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('help_requests'); // 'help_requests', 'analytics', 'users', 'feedback'
    const { logout, currentUser, userRole } = useAuth();

    // Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedFeedbackForAssign, setSelectedFeedbackForAssign] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedUserForProfile, setSelectedUserForProfile] = useState(null);

    // Analytics State
    const [emotionCounts, setEmotionCounts] = useState({});
    const [detailedCounts, setDetailedCounts] = useState({});
    const [expandedEmotions, setExpandedEmotions] = useState({
        Happy: true,
        Stressed: true,
        Anxious: false,
        Neutral: false,
        Sad: false
    });
    const [stats, setStats] = useState({ totalFeedback: 0, mostCommon: 'N/A', pendingHelp: 0 });
    const [selectedDetails, setSelectedDetails] = useState([]);

    // Detailed Analytics Modal
    const [showDetailedModal, setShowDetailedModal] = useState(false);
    const [detailedModalData, setDetailedModalData] = useState({ reason: '', emotion: '', students: [] });
    const [detailedModalSearch, setDetailedModalSearch] = useState('');

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterEmotion, setFilterEmotion] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            if (localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role !== 'admin') {
                return;
            }
            setLoading(true);
            try {
                await Promise.all([fetchUsers(), fetchFeedback(), fetchHelpRequests()]);
                const detailsRes = await apiClient('/student-details');
                setStudentDetailsList(detailsRes);
            } catch (error) {
                console.error("Error in Admin fetchData:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Data Fetching (API) ---
    const fetchUsers = async () => {
        try {
            const userList = await apiClient('/users');
            setUsers(userList.map(u => ({ id: u.uid, ...u })));
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchFeedback = async () => {
        try {
            const data = await apiClient('/analytics');
            const feedbackList = data.map(item => ({
                ...item,
                dateObj: item.timestamp ? new Date(item.timestamp) : new Date(item.date || Date.now())
            }));
            feedbackList.sort((a, b) => b.dateObj - a.dateObj);
            setFeedbacks(feedbackList);
            setFilteredFeedbacks(feedbackList);
            processData(feedbackList);
        } catch (error) {
            console.error("Error fetching feedback:", error);
        }
    };

    const fetchHelpRequests = async () => {
        try {
            const data = await apiClient('/admin/help-requests');
            setHelpRequests(data);
        } catch (error) {
            console.error("Error fetching help requests:", error);
        }
    };

    // --- Analytics Processing ---
    useEffect(() => {
        let result = feedbacks;
        if (dateFrom || dateTo) {
            result = result.filter(item => {
                const itemDate = item.dateObj;
                const from = dateFrom ? new Date(dateFrom) : new Date('1900-01-01');
                const to = dateTo ? new Date(dateTo) : new Date();
                to.setHours(23, 59, 59, 999);
                return itemDate >= from && itemDate <= to;
            });
        }
        if (filterEmotion !== 'All') {
            result = result.filter(item => item.emotion === filterEmotion);
        }
        setFilteredFeedbacks(result);
        processData(result);
    }, [dateFrom, dateTo, filterEmotion, feedbacks, helpRequests]);

    const processData = (data) => {
        const counts = { Happy: 0, Stressed: 0, Anxious: 0, Neutral: 0, Sad: 0 };
        const detailed = {};

        data.forEach(item => {
            if (counts[item.emotion] !== undefined) {
                counts[item.emotion]++;

                // Detailed breakdown
                const emotion = item.emotion;
                const domain = item.emotion_domain || 'Unspecified';
                if (!detailed[emotion]) detailed[emotion] = {};
                detailed[emotion][domain] = (detailed[emotion][domain] || 0) + 1;
            } else if (item.emotion) {
                const key = Object.keys(counts).find(k => k.toLowerCase() === item.emotion.toLowerCase());
                if (key) {
                    counts[key]++;
                    const domain = item.emotion_domain || 'Unspecified';
                    if (!detailed[key]) detailed[key] = {};
                    detailed[key][domain] = (detailed[key][domain] || 0) + 1;
                }
            }
        });
        setEmotionCounts(counts);
        setDetailedCounts(detailed);

        let mostCommon = 'N/A';
        let maxCount = 0;
        Object.entries(counts).forEach(([emotion, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = emotion;
            }
        });

        // Count pending help requests: Strictly "pending" or "none" (not assigned yet)
        const pendingCount = helpRequests.filter(r => !r.status || r.status === 'pending' || r.status === 'none').length;

        setStats({
            totalFeedback: data.length,
            mostCommon: mostCommon,
            pendingHelp: pendingCount
        });
    };

    // --- Actions ---

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Are you sure you want to delete this user? This will also remove all their associated data (details, feedback, etc.) and CANNOT be undone.")) return;
        try {
            await apiClient(`/users/${uid}`, { method: 'DELETE' });
            setUsers(prev => prev.filter(u => (u.id || u.uid) !== uid));
            // Also refresh other lists just in case
            setStudentDetailsList(prev => prev.filter(d => d.uid !== uid));
            alert("User and all associated data deleted successfully.");
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user. Please check console for details.");
        }
    };

    const handleDeleteFeedback = async (id) => {
        if (!window.confirm("Are you sure you want to delete this feedback report? This action cannot be undone.")) return;
        try {
            await apiClient(`/feedback/${id}`, { method: 'DELETE' });
            setFeedbacks(prev => prev.filter(f => (f.id || f._id) !== id));
            setFilteredFeedbacks(prev => prev.filter(f => (f.id || f._id) !== id));

            // Re-process counts for the remaining feedbacks
            const updatedFeedbacks = feedbacks.filter(f => (f.id || f._id) !== id);
            processData(updatedFeedbacks);
        } catch (error) {
            console.error("Error deleting feedback:", error);
            alert("Failed to delete feedback. Please try again.");
        }
    };

    const handleAssignMentor = async (feedbackId, mentorName, facultyEmail) => {
        try {
            await apiClient(`/admin/assign-mentor/${feedbackId}`, {
                method: 'POST',
                body: JSON.stringify({ mentorName, facultyEmail })
            });
            // Refresh data
            fetchHelpRequests();
            fetchFeedback();
            setShowAssignModal(false);
            setSelectedFeedbackForAssign(null);
            alert(`Mentor ${mentorName} assigned successfully!`);
        } catch (error) {
            console.error("Error assigning mentor:", error);
            alert("Failed to assign mentor");
        }
    };

    const handleResolve = async (feedbackId) => {
        if (!window.confirm("Mark this request as resolved?")) return;
        try {
            await apiClient(`/admin/resolve/${feedbackId}`, { method: 'PATCH' });
            fetchHelpRequests();
            fetchFeedback();
            alert("Request resolved successfully.");
        } catch (error) {
            console.error("Error resolving request:", error);
            alert("Failed to resolve request");
        }
    };

    const toggleSelectAllDetails = () => {
        if (selectedDetails.length === studentDetailsList.length) {
            setSelectedDetails([]);
        } else {
            setSelectedDetails(studentDetailsList.map(d => d._id));
        }
    };

    const toggleSelectDetail = (id) => {
        setSelectedDetails(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDeleteDetails = async () => {
        if (!selectedDetails.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedDetails.length} record(s)? This cannot be undone.`)) return;

        try {
            await apiClient('/student-details/bulk', {
                method: 'DELETE',
                body: JSON.stringify({ ids: selectedDetails })
            });
            setStudentDetailsList(prev => prev.filter(d => !selectedDetails.includes(d._id)));
            setSelectedDetails([]);
            alert("Details deleted successfully.");
        } catch (error) {
            console.error("Error bulk deleting details:", error);
            alert(`Failed to delete records: ${error.message || 'Unknown error'}`);
        }
    };

    const handleExport = () => {
        const headers = ['Date,Emotion,Intensity,Category,Triggers,Duration,Impact Score,Support,Comment,Email'];
        const csvContent = filteredFeedbacks.map(f => {
            const dateStr = f.dateObj.toLocaleDateString();
            const triggers = Array.isArray(f.emotion_triggers) ? f.emotion_triggers.join('; ') : (f.emotion_triggers || '');
            return `${dateStr},${f.emotion},${f.emotion_intensity || 3},${f.emotion_domain || ''},"${triggers}","${f.emotion_duration || ''}",${f.life_impact_score || 3},"${f.support_type || ''}","${f.comment || ''}",${f.email || 'Anonymous'}`;
        }).join('\n');

        const blob = new Blob([headers + '\n' + csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'feedback_report.csv';
        a.click();
    };

    const changeView = (view) => {
        setActiveView(view);
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getUserName = () => {
        if (!currentUser) return 'Admin';
        if (currentUser.name) return currentUser.name;
        if (!currentUser.email) return 'Admin';

        const namePart = currentUser.email.split('@')[0];
        // Convert to Title Case
        return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    };

    // --- Chart Data ---
    const pieData = {
        labels: Object.keys(emotionCounts),
        datasets: [
            {
                label: '# of Votes',
                data: Object.values(emotionCounts),
                backgroundColor: [
                    'rgba(16, 185, 129, 0.85)', // Happy
                    'rgba(244, 63, 94, 0.85)',  // Stressed
                    'rgba(245, 158, 11, 0.85)', // Anxious
                    'rgba(148, 163, 184, 0.85)',// Neutral
                    'rgba(59, 130, 246, 0.85)', // Sad
                ],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 12
            },
        ],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#334155',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.raw || 0;
                        const total = context.chart._metasets[context.datasetIndex].total;
                        const percentage = total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
                        return `${label}${value} (${percentage})`;
                    }
                }
            },
            datalabels: {
                labels: {
                    value: {
                        color: '#ffffff',
                        font: {
                            weight: 'bold',
                            size: 16,
                            family: "'Inter', sans-serif"
                        },
                        formatter: (value, ctx) => {
                            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            if (value === 0) return '';
                            return Math.round((value / total) * 100) + '%';
                        },
                        align: 'center',
                        anchor: 'center',
                        textStrokeColor: 'rgba(0, 0, 0, 0.1)',
                        textStrokeWidth: 1,
                        textShadowBlur: 4,
                        textShadowColor: 'rgba(0,0,0,0.3)'
                    },
                    name: {
                        color: (ctx) => {
                            return ctx.chart.data.datasets[0].backgroundColor[ctx.dataIndex];
                        },
                        font: {
                            size: 14,
                            family: "'Inter', sans-serif",
                            weight: '600'
                        },
                        formatter: (value, ctx) => {
                            if (value === 0) return '';
                            return ctx.chart.data.labels[ctx.dataIndex];
                        },
                        align: 'start',
                        anchor: 'start',
                        offset: 15
                    }
                }
            }
        },
        layout: {
            padding: {
                top: 20,
                bottom: 20,
                left: 40,
                right: 40
            }
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    };

    const isHighStress = (emotionCounts['Stressed'] || 0) + (emotionCounts['Anxious'] || 0) > (filteredFeedbacks.length / 2) && filteredFeedbacks.length > 0;

    return (
        <div className="admin-dashboard container" style={{ paddingTop: '20px', position: 'relative' }}>

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

                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '25px', flex: 1 }}>
                            <div onClick={() => changeView('help_requests')} className={`sidebar-link ${activeView === 'help_requests' ? 'active' : ''}`}>🆘 Help Requests</div>
                            <div onClick={() => changeView('analytics')} className={`sidebar-link ${activeView === 'analytics' ? 'active' : ''}`}>📊 Analytics Overview</div>
                            <div onClick={() => changeView('users')} className={`sidebar-link ${activeView === 'users' ? 'active' : ''}`}>👥 User Management</div>
                            <div onClick={() => changeView('student_details')} className={`sidebar-link ${activeView === 'student_details' ? 'active' : ''}`}>👨‍🎓 Student Details</div>
                            <div onClick={() => changeView('feedback')} className={`sidebar-link ${activeView === 'feedback' ? 'active' : ''}`}>📋 Feedback Reports</div>
                        </nav>

                        <div className="sidebar-footer">
                            <div className="sidebar-user-info">
                                <div className="user-avatar">
                                    {getUserName().charAt(0)}
                                </div>
                                <div className="user-details">
                                    <span className="user-name">{getUserName()}</span>
                                    <span className="user-role">Administrator</span>
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

            {/* Summary Cards */}
            <div className="stats-row">
                <SummaryCard title="Total Students" value={studentDetailsList.length} color="var(--text-main)" icon="👥" />
                <SummaryCard title="Total Feedback" value={stats.totalFeedback} color="var(--text-main)" icon="📝" />
                <SummaryCard title="Most Common" value={stats.mostCommon} color="var(--text-main)" icon="📊" />
                <SummaryCard title="Pending Help" value={stats.pendingHelp} color="var(--text-main)" icon="🆘" />
                <SummaryCard
                    title="Status"
                    value={isHighStress ? 'High stress' : 'Normal'}
                    color="var(--text-main)"
                    icon={
                        <svg viewBox="0 0 24 24" width="28" height="28" stroke={isHighStress ? 'var(--status-stressed)' : 'currentColor'} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    }
                />
            </div>

            {/* Conditional Views */}
            {activeView === 'help_requests' && (
                <section className="dashboard-section" id="help-requests-management">
                    <h3>🆘 Help Requests Management</h3>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Student</th>
                                    <th>Emotion</th>
                                    <th>Status</th>
                                    <th>Assigned To</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {helpRequests.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No active help requests.</td></tr>
                                ) : (
                                    helpRequests.map(req => (
                                        <tr key={req.id || req._id}>
                                            <td>{req.date}</td>
                                            <td>
                                                <strong style={{ color: 'var(--text-main)' }}>{req.studentName || 'Unknown User'}</strong>
                                                <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{req.studentEmail || req.email}</div>
                                                <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                    <strong>Domain:</strong> {req.emotion_domain || '—'} |
                                                    <strong> Impact:</strong> {req.life_impact_score}/5 |
                                                    <strong> Duration:</strong> {req.emotion_duration || '—'}
                                                </div>
                                                {req.emotion_triggers && req.emotion_triggers.length > 0 && (
                                                    <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        <strong>Triggers:</strong> {Array.isArray(req.emotion_triggers) ? req.emotion_triggers.join(', ') : req.emotion_triggers}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>"{req.comment}"</div>
                                            </td>
                                            <td>
                                                <span className={`emotion-tag ${req.emotion?.toLowerCase()}`}>{req.emotion}</span>
                                                <span style={{ marginLeft: '5px', fontSize: '0.8em', color: 'var(--text-secondary)' }}>({req.emotion_intensity}/5)</span>
                                            </td>
                                            <td>
                                                {(() => {
                                                    const statusLabels = {
                                                        pending: 'Pending',
                                                        allocated: 'Allocated',
                                                        yet_to_meet: 'Yet to Meet',
                                                        ongoing: 'Ongoing',
                                                        resolved: 'Resolved'
                                                    };
                                                    const s = req.status || 'pending';
                                                    const label = statusLabels[s] || s;

                                                    let colorVar = '--status-pending';
                                                    if (s === 'resolved') colorVar = '--status-resolved';
                                                    else if (s === 'yet_to_meet') colorVar = '--status-yet-to-meet';
                                                    else if (s === 'ongoing') colorVar = '--status-ongoing';
                                                    else if (s === 'allocated') colorVar = '--status-allocated';

                                                    return (
                                                        <span style={{
                                                            backgroundColor: `var(${colorVar})20`,
                                                            color: `var(${colorVar})`,
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.85rem',
                                                            border: `1px solid var(${colorVar})40`
                                                        }}>
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td>{req.assignedMentor || '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    {req.status !== 'resolved' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedFeedbackForAssign(req);
                                                                setShowAssignModal(true);
                                                            }}
                                                            className="btn btn-primary"
                                                            style={{ fontSize: '0.8rem', padding: '5px 10px', width: 'auto', whiteSpace: 'nowrap' }}
                                                        >
                                                            {req.status === 'allocated' ? 'Reassign' : 'Assign Mentor'}
                                                        </button>
                                                    )}
                                                    {req.status === 'resolved' && <span style={{ color: 'var(--success-green)', fontWeight: 'bold' }}>Completed</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeView === 'analytics' && (
                <>
                    {/* Alert Banner */}
                    {isHighStress && (
                        <div style={{ padding: '15px', backgroundColor: 'var(--danger-red)20', border: '1px solid var(--danger-red)', borderRadius: '8px', color: 'var(--danger-red)', marginBottom: '20px' }}>
                            <strong>Alert:</strong> High levels of stress or anxiety detected.
                        </div>
                    )}

                    <div className="card" id="analytics-overview" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', borderTop: '4px solid var(--primary-slate)' }}>
                        <h2 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-main)', paddingRight: '10px' }}>Analytics Overview</h2>
                        <div className="filters" style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, margin: 0 }}>
                            <label>From: <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
                            <label>To: <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
                            <div style={{ marginLeft: 'auto' }}>
                                <button className="btn" style={{ width: 'auto', margin: 0 }} onClick={handleExport}>Export CSV</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: '30px', width: '100%' }}>
                            <div style={{ width: '100%', maxWidth: '600px', height: '400px', position: 'relative' }}>
                                <Doughnut
                                    data={pieData}
                                    options={pieOptions}
                                />
                            </div>
                        </div>
                    </div>

                    <DetailedEmotionReasonAnalytics 
                        filteredFeedbacks={filteredFeedbacks} 
                        onShowStudents={(reason, emotion, students) => {
                            setDetailedModalData({ reason, emotion, students });
                            setShowDetailedModal(true);
                        }}
                    />
                </>
            )}

            {activeView === 'users' && (
                <section className="dashboard-section" id="user-management">
                    <h3>User Management</h3>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td style={{ color: 'var(--text-main)' }}>{user.email}</td>
                                        <td>
                                            <span className="admin-badge" style={{
                                                backgroundColor: user.role === 'admin' ? 'var(--primary-slate)' : 'var(--bg-color)',
                                                color: user.role === 'admin' ? 'white' : 'var(--text-main)',
                                                border: user.role === 'admin' ? 'none' : '1px solid var(--border-color)',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase'
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUserForProfile(user);
                                                        setShowProfileModal(true);
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{
                                                        padding: '5px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        width: 'auto'
                                                    }}
                                                >
                                                    View Profile
                                                </button>
                                                {user.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="btn btn-danger"
                                                            style={{
                                                                padding: '5px 12px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '600',
                                                                width: 'auto'
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeView === 'student_details' && (
                <section className="dashboard-section" id="student-details-view">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3>👨‍🎓 Submitted Student Details</h3>
                        {selectedDetails.length > 0 && (
                            <button
                                onClick={handleBulkDeleteDetails}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: 'var(--danger-red)20',
                                    color: 'var(--danger-red)',
                                    border: '1px solid var(--danger-red)40',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                                Delete Selected ({selectedDetails.length})
                            </button>
                        )}
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedDetails.length === studentDetailsList.length && studentDetailsList.length > 0}
                                            onChange={toggleSelectAllDetails}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Reg No</th>
                                    <th>Dept</th>
                                    <th>Batch</th>
                                    <th>Email</th>
                                    <th>Mobile</th>
                                    <th>Place</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentDetailsList.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center' }}>No student details submitted yet.</td></tr>
                                ) : (
                                    studentDetailsList.map((detail, idx) => (
                                        <tr key={detail._id || idx} style={{ backgroundColor: selectedDetails.includes(detail._id) ? 'var(--bg-color)' : 'inherit' }}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDetails.includes(detail._id)}
                                                    onChange={() => toggleSelectDetail(detail._id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td>{detail.date}</td>
                                            <td><strong>{detail.name}</strong></td>
                                            <td>{detail.regno}</td>
                                            <td>{detail.department}</td>
                                            <td>{detail.batch}</td>
                                            <td>{detail.email}</td>
                                            <td>{detail.mobile}</td>
                                            <td>{detail.place}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeView === 'feedback' && (
                <section className="dashboard-section" id="feedback-reports">
                    <FeedbackReports />
                </section>
            )}

            {/* Modals */}
            {showAssignModal && selectedFeedbackForAssign && (
                <AssignMentorModal
                    feedback={selectedFeedbackForAssign}
                    onClose={() => setShowAssignModal(false)}
                    onAssign={handleAssignMentor}
                />
            )}

            {
                showProfileModal && selectedUserForProfile && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3>User Profile</h3>
                                <button onClick={() => setShowProfileModal(false)} className="modal-close-btn">×</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Full Name</span>
                                    <span style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{selectedUserForProfile.name || 'Not Provided'}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Email Address</span>
                                    <span style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{selectedUserForProfile.email}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Role</span>
                                    <span style={{
                                        fontSize: '0.9rem',
                                        color: 'white',
                                        backgroundColor: selectedUserForProfile.role === 'admin' ? 'var(--primary-slate)' : 'var(--primary-slate-hover)',
                                        padding: '2px 10px',
                                        borderRadius: '12px',
                                        width: 'fit-content',
                                        marginTop: '4px'
                                    }}>
                                        {selectedUserForProfile.role}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Last Login</span>
                                    <span style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                                        {selectedUserForProfile.lastLogin
                                            ? new Date(selectedUserForProfile.lastLogin).toLocaleString()
                                            : 'Never'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                {selectedUserForProfile.role !== 'admin' && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to delete user ${selectedUserForProfile.email}?`)) {
                                                handleDeleteUser(selectedUserForProfile.id);
                                                setShowProfileModal(false);
                                            }
                                        }}
                                        className="btn btn-danger"
                                        style={{ width: 'auto' }}
                                    >
                                        Delete User
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="btn btn-secondary"
                                    style={{ width: 'auto' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Detailed Analytics Drill-down Modal */}
            {showDetailedModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }} onClick={() => setShowDetailedModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-subtle-bg)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>
                                    Students: {detailedModalData.reason} ({detailedModalData.emotion})
                                </h3>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Found {detailedModalData.students.length} record{detailedModalData.students.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowDetailedModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
                            <input 
                                type="text" 
                                placeholder="Search students..." 
                                value={detailedModalSearch}
                                onChange={(e) => setDetailedModalSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 15px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-color)',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Student Name</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Roll Number</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Domain</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedModalData.students
                                        .filter(s => 
                                            s.name.toLowerCase().includes(detailedModalSearch.toLowerCase()) || 
                                            s.id.toLowerCase().includes(detailedModalSearch.toLowerCase())
                                        )
                                        .map((student, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px', color: 'var(--text-main)', fontWeight: '500' }}>{student.name}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>{student.id}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>{student.department}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{student.date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminDashboard;
