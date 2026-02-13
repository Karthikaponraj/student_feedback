import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import SummaryCard from '../components/SummaryCard';
import AssignMentorModal from '../components/AssignMentorModal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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
    const [stats, setStats] = useState({ totalFeedback: 0, mostCommon: 'N/A', pendingHelp: 0 });

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
        data.forEach(item => {
            if (counts[item.emotion] !== undefined) {
                counts[item.emotion]++;
            } else if (item.emotion) {
                const key = Object.keys(counts).find(k => k.toLowerCase() === item.emotion.toLowerCase());
                if (key) counts[key]++;
            }
        });
        setEmotionCounts(counts);

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
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await apiClient(`/users/${uid}`, { method: 'DELETE' });
            setUsers(users.filter(u => u.id !== uid));
        } catch (error) {
            console.error("Error deleting user:", error);
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

    const handleExport = () => {
        const headers = ['Date,Emotion,Comment,Email'];
        const csvContent = filteredFeedbacks.map(f => {
            const dateStr = f.dateObj.toLocaleDateString();
            return `${dateStr},${f.emotion},"${f.comment || ''}",${f.email || 'Anonymous'}`;
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
                    'rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 206, 86, 0.6)', 'rgba(201, 203, 207, 0.6)', 'rgba(54, 162, 235, 0.6)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const isHighStress = (emotionCounts['Stressed'] || 0) + (emotionCounts['Anxious'] || 0) > (filteredFeedbacks.length / 2) && filteredFeedbacks.length > 0;

    return (
        <div className="admin-dashboard container" style={{ paddingTop: '20px', position: 'relative' }}>

            {/* Hamburger Button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                style={{
                    position: 'fixed',
                    top: '85px',
                    left: '20px',
                    zIndex: 100,
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ width: '20px', height: '2px', backgroundColor: '#475569' }}></div>
                    <div style={{ width: '20px', height: '2px', backgroundColor: '#475569' }}></div>
                    <div style={{ width: '20px', height: '2px', backgroundColor: '#475569' }}></div>
                </div>
            </button>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '280px',
                            height: '100%',
                            backgroundColor: 'white',
                            boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '30px 20px',
                            animation: 'slideIn 0.3s ease-out'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>Menu</h3>
                            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
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
                                <div className="sidebar-logout-arrow" onClick={logout} style={{ cursor: 'pointer' }} title="Logout">
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
                <SummaryCard title="Total Feedback" value={stats.totalFeedback} color="#394d46" />
                <SummaryCard title="Most Common" value={stats.mostCommon} color="#50c878" />
                <SummaryCard title="Pending Help" value={stats.pendingHelp} color="#ef4444" />
                <SummaryCard
                    title="Status"
                    value={isHighStress ? 'High Stress' : 'Normal'}
                    color={isHighStress ? '#ef4444' : '#10b981'}
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
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No active help requests.</td></tr>
                                ) : (
                                    helpRequests.map(req => (
                                        <tr key={req.id || req._id}>
                                            <td>{req.date}</td>
                                            <td>
                                                <strong>{req.studentName || 'Unknown User'}</strong>
                                                <div style={{ fontSize: '0.85em', color: '#555' }}>{req.studentEmail || req.email}</div>
                                                <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>"{req.comment}"</div>
                                            </td>
                                            <td>
                                                <span className={`emotion-tag ${req.emotion?.toLowerCase()}`}>{req.emotion}</span>
                                                <span style={{ marginLeft: '5px', fontSize: '0.8em' }}>({req.emotion_intensity}/5)</span>
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

                                                    let color = '#394d46'; // default
                                                    let bgColor = '#f3f4f6';

                                                    if (s === 'pending' || s === 'none') {
                                                        color = '#d97706';
                                                        bgColor = '#fef3c7';
                                                    } else if (s === 'resolved') {
                                                        color = '#059669';
                                                        bgColor = '#ecfdf5';
                                                    } else if (s === 'yet_to_meet') {
                                                        color = '#2563eb';
                                                        bgColor = '#eff6ff';
                                                    } else if (s === 'ongoing') {
                                                        color = '#7c3aed';
                                                        bgColor = '#f5f3ff';
                                                    }

                                                    return (
                                                        <span style={{
                                                            backgroundColor: bgColor,
                                                            color: color,
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.85rem',
                                                            border: `1px solid ${color}30`
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
                                                            className="btn"
                                                            style={{ fontSize: '0.8rem', padding: '5px 10px', width: 'auto' }}
                                                        >
                                                            {req.status === 'allocated' ? 'Reassign' : 'Assign Mentor'}
                                                        </button>
                                                    )}
                                                    {req.status === 'resolved' && <span>Completed</span>}
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
                        <div style={{ padding: '15px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#991b1b', marginBottom: '20px' }}>
                            <strong>Alert:</strong> High levels of stress or anxiety detected.
                        </div>
                    )}

                    <div className="card" id="analytics-overview">
                        <h3>Analytics Overview</h3>
                        <div className="filters">
                            <label>From: <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
                            <label>To: <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
                            <button className="btn" style={{ width: 'auto' }} onClick={handleExport}>Export CSV</button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '60px', marginTop: '30px' }}>
                            <div style={{ width: '320px', height: '320px' }}>
                                <Pie
                                    data={pieData}
                                    options={{
                                        plugins: {
                                            legend: {
                                                display: false // Hide default legend to use our custom one
                                            }
                                        }
                                    }}
                                />
                            </div>

                            {/* Custom Side Legend with Counts */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '15px',
                                padding: '20px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                minWidth: '200px'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Emotion Distribution
                                </h4>
                                {Object.entries(emotionCounts).map(([emotion, count], idx) => (
                                    <div key={emotion} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                backgroundColor: pieData.datasets[0].backgroundColor[idx],
                                                borderRadius: '3px'
                                            }}></div>
                                            <span style={{ fontSize: '1rem', fontWeight: '500', color: '#1e293b' }}>{emotion}</span>
                                        </div>
                                        <span style={{
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            color: '#394d46',
                                            backgroundColor: '#f9fafb',
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                        }}>
                                            {count}
                                        </span>
                                    </div>
                                ))}
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>Total</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{filteredFeedbacks.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
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
                                        <td>{user.email}</td>
                                        <td>
                                            <span className="admin-badge" style={{
                                                backgroundColor: user.role === 'admin' ? '#394d46' : '#f1f5f9',
                                                color: user.role === 'admin' ? 'white' : '#475569',
                                                border: user.role === 'admin' ? 'none' : '1px solid #e2e8f0',
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
                                                    style={{
                                                        background: '#f9fafb',
                                                        color: '#394d46',
                                                        border: '1px solid #e5e7eb',
                                                        padding: '5px 12px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    View Profile
                                                </button>
                                                {user.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            style={{
                                                                background: '#fee2e2',
                                                                color: '#ef4444',
                                                                border: '1px solid #fca5a5',
                                                                padding: '5px 12px',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '600'
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
                    <h3>👨‍🎓 Submitted Student Details</h3>
                    <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
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
                                    <tr><td colSpan="8" style={{ textAlign: 'center' }}>No student details submitted yet.</td></tr>
                                ) : (
                                    studentDetailsList.map((detail, idx) => (
                                        <tr key={detail._id || idx}>
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
                    <h3>Recent Feedback Reports</h3>
                    <div className="filters">
                        <select value={filterEmotion} onChange={(e) => setFilterEmotion(e.target.value)}>
                            <option value="All">All Emotions</option>
                            <option value="Happy">Happy</option>
                            <option value="Stressed">Stressed</option>
                            <option value="Sad">Sad</option>
                            <option value="Anxious">Anxious</option>
                            <option value="Neutral">Neutral</option>
                        </select>
                    </div>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Student</th>
                                    <th>Emotion</th>
                                    <th>Comment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFeedbacks.slice(0, 50).map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td>{item.dateObj.toLocaleDateString()}</td>
                                        <td>
                                            <strong>{item.studentName || 'Unknown'}</strong>
                                            <div style={{ fontSize: '0.8em', color: '#777' }}>{item.studentEmail || item.email}</div>
                                        </td>
                                        <td>
                                            <span className={`emotion-tag ${item.emotion?.toLowerCase()}`}>
                                                {item.emotion}
                                            </span>
                                        </td>
                                        <td>{item.comment}</td>
                                        <td>
                                            <button
                                                onClick={() => handleDeleteFeedback(item.id || item._id)}
                                                style={{
                                                    backgroundColor: '#fee2e2',
                                                    color: '#ef4444',
                                                    border: '1px solid #fca5a5',
                                                    padding: '5px 10px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredFeedbacks.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>No feedback found</td></tr>}
                            </tbody>
                        </table>
                    </div>
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

            {showProfileModal && selectedUserForProfile && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '16px',
                        width: '400px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>User Profile</h3>
                            <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Full Name</span>
                                <span style={{ fontSize: '1.1rem', color: '#1e293b' }}>{selectedUserForProfile.name || 'Not Provided'}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Email Address</span>
                                <span style={{ fontSize: '1.1rem', color: '#1e293b' }}>{selectedUserForProfile.email}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Role</span>
                                <span style={{
                                    fontSize: '0.9rem',
                                    color: 'white',
                                    backgroundColor: selectedUserForProfile.role === 'admin' ? '#2a3833' : '#394d46',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    width: 'fit-content',
                                    marginTop: '4px'
                                }}>
                                    {selectedUserForProfile.role}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Last Login</span>
                                <span style={{ fontSize: '1.1rem', color: '#1e293b' }}>
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
                                    style={{
                                        backgroundColor: '#fee2e2',
                                        color: '#ef4444',
                                        border: '1px solid #fca5a5',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Delete User
                                </button>
                            )}
                            <button
                                onClick={() => setShowProfileModal(false)}
                                style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
