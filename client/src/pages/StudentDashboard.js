import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const StudentDashboard = () => {
    const [emotion, setEmotion] = useState('');
    const [emotionIntensity, setEmotionIntensity] = useState(3);
    const [requestHelp, setRequestHelp] = useState(false);
    const [comment, setComment] = useState('');
    const [studentDetails, setStudentDetails] = useState({
        name: '',
        regno: '',
        department: '',
        batch: '',
        email: '',
        mobile: '',
        place: ''
    });
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [lastEmotion, setLastEmotion] = useState(null);
    const [detailsSubmitted, setDetailsSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('feedback_form'); // 'feedback_form', 'history', 'counselling_progress', 'counselling_tracker'

    // Additional restored fields
    const [emotionDomain, setEmotionDomain] = useState('');
    const [emotionDuration, setEmotionDuration] = useState('');
    const [lifeImpactScore, setLifeImpactScore] = useState(3);
    const [selectedTriggers, setSelectedTriggers] = useState([]);
    const [counsellingSessions, setCounsellingSessions] = useState([]);

    const REASONS_TO_TRIGGERS = {
        'Academics': [
            'Difficulty understanding course concepts',
            'Heavy assignment workload',
            'Low marks in internal assessments',
            'Struggling to balance multiple subjects',
            'Other'
        ],
        'Exam Pressure': [
            'Upcoming semester exams',
            'Fear of failing exams',
            'Last-minute exam preparation',
            'Multiple exams scheduled close together',
            'Other'
        ],
        'PS Assessments': [
            'Difficult Questions',
            'Failed Testcases',
            'Result Anxiety',
            'Skill Gap',
            'Other'
        ],
        'Placements': [
            'Placement interview preparation',
            'Fear of not getting placed',
            'High competition among students',
            'Rejection in placement interviews',
            'Other'
        ],
        'Reward / Performance Points': [
            'Low RP',
            'Redemption Date is Nearing',
            'Couldn\'t Able to Score Average RP',
            'Fear of Internal Marks',
            'Other'
        ],
        'Personal / Family Issues': [
            'Family conflicts or disagreements',
            'Homesickness',
            'Family health problems',
            'Personal relationship issues',
            'Other'
        ],
        'Physical Health': [
            'Illness affecting daily activities',
            'Lack of sleep or fatigue',
            'Frequent headaches or body pain',
            'Difficulty maintaining a healthy routine',
            'Other'
        ],
        'Financial Issues': [
            'Difficulty paying college fees',
            'Family financial problems',
            'Education loan pressure',
            'Lack of funds for study materials',
            'Other'
        ],
        'Friends / Social Life': [
            'Conflict with friends',
            'Feeling isolated from peers',
            'Difficulty making new friends',
            'Peer pressure in social situations',
            'Other'
        ],
        'Faculty Related': [
            'Difficulty communicating with faculty',
            'Strict evaluation or grading',
            'Lack of academic guidance',
            'Fear of approaching faculty for help',
            'Other'
        ]
    };

    const HAPPY_REASONS = [
        "Academic Achievement",
        "Placement / Internship Success",
        "Good Exam Results",
        "Faculty Appreciation",
        "Personal Achievement",
        "Participation in Events or Competitions",
        "Family Support or Good News",
        "Friends or Social Activities",
        "Skill Development or Learning Something New",
        "Recognition or Awards"
    ];
    
    // Happy specific fields
    const [outcomeOfHappiness, setOutcomeOfHappiness] = useState('');
    const [suggestToOthers, setSuggestToOthers] = useState('');
    const [suggestionText, setSuggestionText] = useState('');
    
    
    const { logout, currentUser } = useAuth();

    const changeView = (view) => {
        setActiveView(view);
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getUserName = () => {
        if (!currentUser) return 'Student';
        if (currentUser.name) return currentUser.name;
        if (!currentUser.email) return 'Student';
        const namePart = currentUser.email.split('@')[0];
        return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    };

    useEffect(() => {
        if (currentUser && currentUser.email) {
            setStudentDetails(prev => ({ ...prev, email: currentUser.email }));
        }
    }, [currentUser]);

    const validateDetails = () => {
        const { name, regno, department, batch, email, mobile, place } = studentDetails;
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isMobileValid = /^\d{10}$/.test(mobile);
        const isRegNoValid = /^[a-zA-Z0-9]+$/.test(regno);

        return name && regno && department && batch && email && mobile && place &&
            isEmailValid && isMobileValid && isRegNoValid;
    };

    const validateForm = () => {
        if (!detailsSubmitted || hasOngoingCase || !emotion || !comment.trim() || !emotionDomain.trim() || !emotionDuration) {
            return false;
        }

        if (emotion === 'Happy') {
            if (!outcomeOfHappiness.trim() || !suggestToOthers) return false;
            if (suggestToOthers === 'Yes' && !suggestionText.trim()) return false;
        } else {
            // Require at least one trigger for other emotions if a reason is selected
            if (REASONS_TO_TRIGGERS[emotionDomain] && selectedTriggers.length === 0) return false;
        }

        return true;
    };

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setStudentDetails(prev => ({ ...prev, [name]: value }));
    };

    const checkDetails = async () => {
        console.log("🔍 Checking if student details exist...");
        try {
            const data = await apiClient('/student-details/me');
            if (data && data.email) {
                console.log("✅ Student details found!", data);
                setStudentDetails(data);
                setDetailsSubmitted(true);
            } else {
                console.log("ℹ️ No student details found on file.");
            }
        } catch (error) {
            if (error.status === 404) {
                console.log("ℹ️ Student details not found (404).");
            } else {
                console.error("❌ Error checking student details:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const data = await apiClient('/my-feedback');
            // Sort by timestamp descending (latest first)
            // Use _id as fallback since it also contains time information in MongoDB
            const sortedData = [...data].sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp) : 0;
                const timeB = b.timestamp ? new Date(b.timestamp) : 0;
                if (timeA !== timeB) return timeB - timeA;
                return (b.id || "").localeCompare(a.id || "");
            });
            
            setHistory(sortedData);
            if (sortedData.length > 0) {
                setLastEmotion(sortedData[0]);
            }
        } catch (error) {
            console.error("Error fetching history", error);
        }
    };

    const handleSOSUpdate = async (id, status) => {
        try {
            await apiClient(`/feedback/sos-adoption/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ sos_adoption: status })
            });
            fetchHistory();
            setMessage({ text: `SOS Help status updated to ${status}!`, type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error("Error updating SOS status:", error);
            setMessage({ text: 'Error updating status.', type: 'error' });
        }
    };

    const fetchCounsellingSessions = async () => {
        try {
            const data = await apiClient('/my-counselling-progress');
            setCounsellingSessions(data);
        } catch (error) {
            console.error("Error fetching counselling sessions", error);
        }
    };

    useEffect(() => {
        checkDetails();
        fetchHistory();
        fetchCounsellingSessions();
    }, []);

    const handleDetailsSubmit = async () => {
        if (!validateDetails()) return;
        try {
            await apiClient('/student-details', {
                method: 'POST',
                body: JSON.stringify(studentDetails)
            });
            setDetailsSubmitted(true);
            setStudentDetails({
                name: '', regno: '', department: '', batch: '', email: '', mobile: '', place: ''
            });
            setMessage({ text: 'Student details saved successfully. Feedback form unlocked!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error) {
            const errorMsg = error.message || 'Error saving details. Please try again.';
            setMessage({ text: errorMsg, type: 'error' });
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await apiClient('/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    emotion,
                    comment,
                    emotion_intensity: emotionIntensity,
                    emotion_domain: emotionDomain,
                    emotion_duration: emotionDuration,
                    life_impact_score: lifeImpactScore,
                    emotion_triggers: selectedTriggers,
                    outcome_of_happiness: outcomeOfHappiness,
                    suggest_to_others: suggestToOthers,
                    suggestion_text: suggestionText,
                    helpRequested: requestHelp
                })
            });

            setMessage({ text: 'Feedback submitted successfully!', type: 'success' });
            setEmotion('');
            setEmotionIntensity(3);
            setRequestHelp(false);
            setComment('');
            setEmotionDomain('');
            setSelectedTriggers([]);
            setEmotionDuration('');
            setLifeImpactScore(3);
            setOutcomeOfHappiness('');
            setSuggestToOthers('');
            setSuggestionText('');
            await fetchHistory();
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            setMessage({ text: 'Error submitting feedback. Please try again.', type: 'error' });
            console.error(error);
        }
    };

    const emotions = ['Happy', 'Stressed', 'Anxious', 'Neutral', 'Sad'];

    const emotionTooltips = {
        Happy: "Feeling relaxed and positive",
        Stressed: "Overwhelmed or under pressure",
        Anxious: "Feeling uneasy or worried",
        Neutral: "Feeling okay or balanced",
        Sad: "Feeling low or discouraged"
    };

    const emotionSuggestions = {
        Happy: "😊 Keep going! You're doing great. Maintain this positive energy!",
        Stressed: "😟 Try taking a short break or talk to your mentor.",
        Anxious: "😰 It's okay to feel anxious. Consider discussing this with a faculty member or a friend.",
        Sad: "😢 You're not alone. Consider sharing this with faculty.",
        Neutral: "🙂 Hope your day gets even better!"
    };

    const getEmotionColor = (e) => {
        switch (e) {
            case 'Happy': return '#50c878';
            case 'Stressed': return '#ff6b6b';
            case 'Anxious': return '#f1c40f';
            case 'Sad': return '#3498db';
            default: return '#95a5a6';
        }
    };

    const getEmotionEmoji = (e) => {
        switch (e) {
            case 'Happy': return '😊';
            case 'Stressed': return '😫';
            case 'Anxious': return '😰';
            case 'Sad': return '😢';
            case 'Neutral': return '😐';
            default: return '😐';
        }
    };

    const hasOngoingCase = history.length > 0 && history[0].status !== 'resolved' && (history[0].helpRequested || history[0].status === 'ongoing');

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <div className="loader">Loading...</div>
                <p>Checking your profile status...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '20px', position: 'relative' }}>
            
            {/* Hamburger Button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="hamburger-btn"
                style={{ top: '80px', left: '20px', zIndex: 1100 }} // Ensure visibility below/above navbar
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
                    style={{ zIndex: 2000 }} // Ensure it's above everything including the navbar
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
                            <div onClick={() => changeView('feedback_form')} className={`sidebar-link ${activeView === 'feedback_form' ? 'active' : ''}`}>📝 Feedback Form</div>
                            <div onClick={() => changeView('history')} className={`sidebar-link ${activeView === 'history' ? 'active' : ''}`}>📜 Feedback History</div>
                            <div onClick={() => changeView('counselling_progress')} className={`sidebar-link ${activeView === 'counselling_progress' ? 'active' : ''}`}>🧑‍🏫 Counselling Progress</div>
                            <div onClick={() => changeView('counselling_tracker')} className={`sidebar-link ${activeView === 'counselling_tracker' ? 'active' : ''}`}>📈 Progress Tracker</div>
                        </nav>

                        <div className="sidebar-footer">
                            <div className="sidebar-user-info">
                                <div className="user-avatar">
                                    {getUserName().charAt(0)}
                                </div>
                                <div className="user-details">
                                    <span className="user-name">{getUserName()}</span>
                                    <span className="user-role">Student</span>
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
            {activeView === 'feedback_form' && lastEmotion && (
                <div style={{
                    backgroundColor: '#fff',
                    padding: '10px 22px',
                    borderRadius: '50px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginBottom: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e2e8f0',
                    borderLeft: `5px solid ${getEmotionColor(lastEmotion.emotion)}`
                }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>Last Check-in:</span> 
                    <span style={{ marginLeft: '10px', fontSize: '1.1rem', color: '#475569', fontWeight: 600 }}>{lastEmotion.emotion}</span>
                    <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>({lastEmotion.date})</span>
                </div>
            )}

            {activeView === 'feedback_form' && (
                <div style={{ textAlign: 'left', marginBottom: '35px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-slate)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Emotional Wellbeing Form
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Help us understand how you're doing today.</p>
                </div>
            )}

            {activeView === 'feedback_form' && (
                <>

            {/* Student Details Section - Only show if not submitted */}
            {!detailsSubmitted && (
                <div className="card" style={{ marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>👤</span> Student Details
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input name="name" value={studentDetails.name} onChange={handleDetailChange} placeholder="Enter your full name" required />
                        </div>
                        <div className="form-group">
                            <label>Register Number *</label>
                            <input name="regno" value={studentDetails.regno} onChange={handleDetailChange} placeholder="No special characters" required />
                            {studentDetails.regno && !/^[a-zA-Z0-9]+$/.test(studentDetails.regno) && <span style={{ color: 'red', fontSize: '0.8rem' }}>Invalid format</span>}
                        </div>
                        <div className="form-group">
                            <label>Department *</label>
                            <select name="department" value={studentDetails.department} onChange={handleDetailChange} required>
                                <option value="">Select Department</option>
                                <optgroup label="B.E. (Bachelor of Engineering)">
                                    <option value="BE-CIVIL">B.E. Civil Engineering</option>
                                    <option value="BE-MECH">B.E. Mechanical Engineering</option>
                                    <option value="BE-EEE">B.E. Electrical Engineering</option>
                                    <option value="BE-AGRI">B.E. Agricultural Engineering</option>
                                    <option value="BE-ECE">B.E. Electronics and Communication Engineering (ECE)</option>
                                    <option value="BE-CSE">B.E. Computer Science and Engineering (CSE)</option>
                                </optgroup>
                                <optgroup label="B.Tech. (Bachelor of Technology)">
                                    <option value="BTECH-CSBS">B.Tech. Computer Science and Business Systems</option>
                                    <option value="BTECH-IT">B.Tech. Information Technology (IT)</option>
                                    <option value="BTECH-AIDS">B.Tech. Artificial Intelligence & Data Science</option>
                                    <option value="BTECH-FOOD">B.Tech. Food Technology / Food Engineering</option>
                                    <option value="BTECH-BIOTECH">B.Tech. Biotechnology</option>
                                </optgroup>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Batch *</label>
                            <input name="batch" value={studentDetails.batch} onChange={handleDetailChange} placeholder="e.g. 2021-2025" required />
                        </div>
                        <div className="form-group">
                            <label>Email Address *</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={studentDetails.email} 
                                onChange={handleDetailChange} 
                                placeholder="Valid email required" 
                                required 
                                readOnly={!!currentUser?.email}
                                style={{ backgroundColor: currentUser?.email ? '#f8fafc' : undefined, color: currentUser?.email ? '#64748b' : undefined }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Mobile Number *</label>
                            <input type="tel" name="mobile" value={studentDetails.mobile} onChange={handleDetailChange} placeholder="10 digits" required />
                            {studentDetails.mobile && !/^\d{10}$/.test(studentDetails.mobile) && <span style={{ color: 'red', fontSize: '0.8rem' }}>Must be 10 digits</span>}
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Place *</label>
                            <input name="place" value={studentDetails.place} onChange={handleDetailChange} placeholder="City/Town" required />
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn"
                        onClick={handleDetailsSubmit}
                        disabled={!validateDetails()}
                        style={{ marginTop: '20px', backgroundColor: '#50c878', opacity: !validateDetails() ? 0.6 : 1 }}
                    >
                        Submit Details
                    </button>
                </div>
            )}

            {!detailsSubmitted && <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '40px 0' }} />}

            {hasOngoingCase && (
                <div style={{
                    backgroundColor: '#fef9c3',
                    border: '1px solid #fef08a',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '20px',
                    color: '#854d0e',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#854d0e' }}>
                        🟡 Counselling Request / Session In Progress
                    </h3>
                    <p style={{ margin: 0, lineHeight: '1.5', fontSize: '0.95rem' }}>
                        Your emotional feedback is currently being addressed by a faculty member.
                        <br /><br />
                        New emotional feedback will be available once the counselling session has been completed.
                    </p>
                </div>
            )}

            <div className={`card ${(hasOngoingCase || !detailsSubmitted) ? 'disabled-section' : ''}`} style={{ 
                opacity: (hasOngoingCase || !detailsSubmitted) ? 0.7 : 1, 
                pointerEvents: (hasOngoingCase || !detailsSubmitted) ? 'none' : 'auto',
                position: 'relative'
            }}>
                <h2 style={{ color: detailsSubmitted ? 'var(--primary-slate)' : '#94a3b8' }}>How are you feeling today?</h2>
                {!detailsSubmitted && <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Please submit your details first to unlock the feedback form.</p>}
                {hasOngoingCase && <p style={{ color: '#854d0e', fontWeight: 'bold' }}>🔒 Form locked: Feedback is currently being addressed.</p>}
                {message.text && (
                    <p style={{
                        color: message.type === 'success' ? 'green' : 'red',
                        fontWeight: 'bold',
                        padding: '10px',
                        backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                        borderRadius: '5px',
                        marginBottom: '10px',
                        animation: 'fadeIn 0.5s'
                    }}>
                        {message.text}
                    </p>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Select Emotion:</label>
                        <div className="emotions-grid">
                            {emotions.map(e => (
                                <div
                                    key={e}
                                    className={`emotion-card ${emotion === e ? 'selected' : ''}`}
                                    onClick={() => {
                                        setEmotion(e);
                                        setEmotionIntensity(3);
                                        setEmotionDomain('');
                                        setOutcomeOfHappiness('');
                                        setSuggestToOthers('');
                                        setSuggestionText('');
                                    }}
                                    title={emotionTooltips[e]}
                                    style={{
                                        borderColor: emotion === e ? getEmotionColor(e) : '#ddd',
                                        backgroundColor: emotion === e ? `${getEmotionColor(e)}20` : 'white',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem', display: 'block' }}>
                                        {getEmotionEmoji(e)}
                                    </span>
                                    {e}
                                </div>
                            ))}
                        </div>
                    </div>

                    {emotion && (
                        <div style={{ marginBottom: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold' }}>
                                        Emotion Intensity: {emotionIntensity}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={emotionIntensity}
                                    onChange={(e) => setEmotionIntensity(Number(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
                                    <span>Low</span>
                                    <span>Very High</span>
                                </div>
                            </div>

                            {emotionSuggestions[emotion] && (
                                <div style={{
                                    padding: '15px',
                                    backgroundColor: '#e3f2fd',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    marginTop: '20px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    color: '#0d47a1',
                                    transition: 'all 0.3s ease-in-out',
                                    animation: 'fadeIn 0.5s ease-in-out'
                                }}>
                                    <style>
                                        {`
                                            @keyframes fadeIn {
                                                from { opacity: 0; transform: translateY(-10px); }
                                                to { opacity: 1; transform: translateY(0); }
                                            }
                                        `}
                                    </style>
                                    <strong>💡 Suggestion:</strong> {emotionSuggestions[emotion]}
                                </div>
                            )}

                            {['Sad', 'Anxious', 'Stressed'].includes(emotion) && (
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff0f0', padding: '10px', borderRadius: '5px', border: '1px solid #ffcccc' }}>
                                    <input
                                        type="checkbox"
                                        id="requestHelp"
                                        checked={requestHelp}
                                        onChange={(e) => setRequestHelp(e.target.checked)}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <label htmlFor="requestHelp" style={{ margin: 0, color: '#d32f2f', fontWeight: 'bold' }}>
                                        I want someone to reach out to me
                                    </label>
                                </div>
                            )}

                            {/* Additional Required Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>What is mainly affecting you today? *</label>
                                    <select 
                                        value={emotionDomain}
                                        onChange={(e) => {
                                            setEmotionDomain(e.target.value);
                                            setSelectedTriggers([]); // Reset triggers when reason changes
                                        }}
                                        style={{ borderColor: !emotionDomain ? '#ffcc00' : undefined }}
                                        required
                                    >
                                        <option value="">Select Primary Cause</option>
                                        {emotion === 'Happy' ? (
                                            HAPPY_REASONS.map(reason => (
                                                <option key={reason} value={reason}>{reason}</option>
                                            ))
                                        ) : (
                                            Object.keys(REASONS_TO_TRIGGERS).map(reason => (
                                                <option key={reason} value={reason}>{reason}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>How long have you been feeling this? *</label>
                                    <select 
                                        value={emotionDuration} 
                                        onChange={(e) => setEmotionDuration(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Duration</option>
                                        <option value="Few hours">Few hours</option>
                                        <option value="Today">Today</option>
                                        <option value="2-3 days">2-3 days</option>
                                        <option value="1 week">1 week</option>
                                        <option value="More than a week">More than a week</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dynamic Triggers Section */}
                            {emotion !== 'Happy' && emotionDomain && REASONS_TO_TRIGGERS[emotionDomain] && (
                                <div className="form-group" style={{ 
                                    animation: 'fadeIn 0.4s ease-out', 
                                    backgroundColor: '#f8fafc', 
                                    padding: '15px', 
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '20px'
                                }}>
                                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#1e293b' }}>
                                        What specifically triggered this? (Select all that apply) *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {REASONS_TO_TRIGGERS[emotionDomain].map(trigger => (
                                            <label key={trigger} style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                fontSize: '0.9rem',
                                                cursor: 'pointer',
                                                padding: '5px'
                                            }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedTriggers.includes(trigger)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedTriggers(prev => [...prev, trigger]);
                                                        } else {
                                                            setSelectedTriggers(prev => prev.filter(t => t !== trigger));
                                                        }
                                                    }}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                {trigger}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold' }}>
                                        How much is this affecting your daily life? (1-5)
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={lifeImpactScore}
                                    onChange={(e) => setLifeImpactScore(Number(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
                                    <span>Minimal Impact</span>
                                    <span>Major Impact</span>
                                </div>
                            </div>

                            {/* Happy Emotion Custom Form Logic */}
                            {emotion === 'Happy' && (
                                <div style={{ padding: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '20px' }}>
                                    <h3 style={{ color: '#166534', marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Share your happiness</h3>
                                    <div className="form-group">
                                        <label>Outcome of happiness: *</label>
                                        <input 
                                            type="text"
                                            value={outcomeOfHappiness}
                                            onChange={(e) => setOutcomeOfHappiness(e.target.value)}
                                            placeholder="What positive outcome did this lead to?"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Would you suggest this to others? *</label>
                                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input 
                                                    type="radio" 
                                                    name="suggestToOthers" 
                                                    value="Yes" 
                                                    checked={suggestToOthers === 'Yes'}
                                                    onChange={(e) => setSuggestToOthers(e.target.value)}
                                                /> Yes
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input 
                                                    type="radio" 
                                                    name="suggestToOthers" 
                                                    value="No" 
                                                    checked={suggestToOthers === 'No'}
                                                    onChange={(e) => setSuggestToOthers(e.target.value)}
                                                /> No
                                            </label>
                                        </div>
                                    </div>
                                    {suggestToOthers === 'Yes' && (
                                        <div className="form-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                                            <label>Suggestion: *</label>
                                            <textarea 
                                                rows="2"
                                                value={suggestionText}
                                                onChange={(e) => setSuggestionText(e.target.value)}
                                                placeholder="What is your suggestion for others?"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Reason for your emotion:</label>
                        <textarea
                            rows="3"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Please share why you are feeling this way..."
                            required
                            style={{
                                borderColor: (!comment.trim() && emotion) ? '#ffcc00' : undefined // Soft warning border
                            }}
                        />
                        {/* Inline validation message - Soft warning */}
                        {(!comment.trim() && emotion) && (
                            <p style={{ color: '#d32f2f', fontSize: '0.9rem', marginTop: '5px' }}>
                                Please tell us why you feel this way.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn"
                        disabled={!validateForm()}
                        style={{ opacity: !validateForm() ? 0.6 : 1, cursor: !validateForm() ? 'not-allowed' : 'pointer', marginTop: '20px' }}
                    >
                        Submit Feedback
                    </button>
                </form>
            </div>
            </>
            )}

            {/* Counselling Progress Tracker Section */}
            {activeView === 'counselling_tracker' && (
                counsellingSessions.length > 0 ? (
                    <div className="card" style={{ 
                        marginBottom: '30px', 
                        boxShadow: 'var(--shadow-premium)', 
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-subtle-bg)',
                        overflow: 'hidden',
                        padding: '0'
                    }}>
                    <div style={{ 
                        padding: '25px 30px', 
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#fff'
                    }}>
                        <div>
                            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '1.6rem' }}>📈</span> Counselling Progress Tracker
                            </h2>
                            <p style={{ margin: '4px 0 0 40px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Visualizing your emotional wellbeing journey
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Latest Status</div>
                            <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: 700, 
                                color: getEmotionColor(counsellingSessions[0].emotion_level ? {5:'Happy', 4:'Neutral', 3:'Anxious', 2:'Stressed', 1:'Sad'}[counsellingSessions[0].emotion_level] : 'Neutral'),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                justifyContent: 'flex-end'
                            }}>
                                {getEmotionEmoji({5:'Happy', 4:'Neutral', 3:'Anxious', 2:'Stressed', 1:'Sad'}[counsellingSessions[0].emotion_level] || 'Neutral')}
                                {{5:'Happy', 4:'Neutral', 3:'Anxious', 2:'Stressed', 1:'Sad'}[counsellingSessions[0].emotion_level] || 'Neutral'}
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '20px', 
                        padding: '20px 30px',
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid var(--border-color)'
                    }}>
                        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '1.5rem' }}>🎯</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Sessions</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{counsellingSessions.length}</div>
                            </div>
                        </div>
                        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '1.5rem' }}>📊</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Mood Trend</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {counsellingSessions.length > 1 && counsellingSessions[0].emotion_level >= counsellingSessions[1].emotion_level ? '↗️ Positive' : '➡️ Stable'}
                                </div>
                            </div>
                        </div>
                        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '1.5rem' }}>📅</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Last Session</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{counsellingSessions[0].session_date}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1.2fr', gap: '40px', alignItems: 'start' }}>
                        {/* Chart Side */}
                        <div style={{ position: 'relative' }}>
                             <div style={{ height: '320px', backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.03)' }}>
                                <Line
                                    data={{
                                        labels: counsellingSessions.slice().reverse().map((s, i) => `Session ${i + 1}`),
                                        datasets: [{
                                            label: 'Emotional Level',
                                            data: counsellingSessions.slice().reverse().map(s => s.emotion_level || 3),
                                            borderColor: '#10b981',
                                            borderWidth: 4,
                                            backgroundColor: (context) => {
                                                const ctx = context.chart.ctx;
                                                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                                                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
                                                gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                                                return gradient;
                                            },
                                            tension: 0.45,
                                            pointRadius: 6,
                                            pointBackgroundColor: '#fff',
                                            pointBorderColor: '#10b981',
                                            pointBorderWidth: 3,
                                            pointHoverRadius: 9,
                                            pointHoverBackgroundColor: '#10b981',
                                            pointHoverBorderColor: '#fff',
                                            pointHoverBorderWidth: 4,
                                            fill: true
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
                                        scales: {
                                            y: {
                                                min: 0.5,
                                                max: 5.5,
                                                grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false },
                                                ticks: {
                                                    stepSize: 1,
                                                    font: { size: 11, weight: '600' },
                                                    color: '#94a3b8',
                                                    callback: (value) => {
                                                        const labels = { 5: 'Happy', 4: 'Neutral', 3: 'Anxious', 2: 'Stressed', 1: 'Sad' };
                                                        return labels[value] || '';
                                                    }
                                                }
                                            },
                                            x: {
                                                grid: { display: false },
                                                ticks: { font: { size: 11, weight: '600' }, color: '#94a3b8' }
                                            }
                                        },
                                        plugins: { 
                                            legend: { display: false },
                                            tooltip: {
                                                backgroundColor: '#1e293b',
                                                padding: 12,
                                                titleFont: { size: 14, weight: 'bold' },
                                                bodyFont: { size: 13 },
                                                cornerRadius: 8,
                                                displayColors: false,
                                                callbacks: {
                                                    title: (context) => {
                                                        const sessionIdx = counsellingSessions.length - 1 - context[0].dataIndex;
                                                        return `Session on ${counsellingSessions[sessionIdx].session_date}`;
                                                    },
                                                    label: (context) => {
                                                        const labels = { 5: 'Happy', 4: 'Neutral', 3: 'Anxious', 2: 'Stressed', 1: 'Sad' };
                                                        return ` Feeling: ${labels[context.raw] || 'Unknown'}`;
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                                    <span>Improved</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                                    <span>Monitoring</span>
                                </div>
                            </div>
                        </div>

                        {/* Sessions Side */}
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#3b82f6' }}>🕒</span> Recent Journey
                            </h3>
                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '12px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '380px' }}>
                                {counsellingSessions.map((session, idx) => (
                                    <div key={idx} style={{ 
                                        padding: '20px', 
                                        backgroundColor: '#fff', 
                                        borderRadius: '16px', 
                                        border: '1px solid var(--border-color)',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ 
                                                    width: '32px', 
                                                    height: '32px', 
                                                    borderRadius: '10px', 
                                                    backgroundColor: '#eff6ff', 
                                                    color: '#3b82f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '0.8rem'
                                                }}>
                                                    {counsellingSessions.length - idx}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                                                    Session {getEmotionEmoji({5:'Happy', 4:'Neutral', 3:'Anxious', 2:'Stressed', 1:'Sad'}[session.emotion_level])}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                                                {session.session_date}
                                            </span>
                                        </div>
                                        
                                        <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', paddingLeft: '42px' }}>
                                            <p style={{ margin: 0 }}>
                                                <strong style={{ color: '#1e293b' }}>Insight:</strong> {session.advice}
                                            </p>
                                        </div>

                                        {session.next_followup_date && (
                                            <div style={{ 
                                                marginTop: '15px', 
                                                marginLeft: '42px',
                                                padding: '8px 12px', 
                                                backgroundColor: '#fff7ed', 
                                                borderRadius: '8px', 
                                                fontSize: '0.8rem', 
                                                color: '#c2410c', 
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                border: '1px solid #ffedd5'
                                            }}>
                                                <span>📅 Next Follow-Up:</span> {session.next_followup_date}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
                        <span style={{ fontSize: '3rem' }}>📈</span>
                        <h3>No Progress Data Yet</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Complete a few check-ins to see your emotional journey visualized.</p>
                    </div>
                )
            )}

            {activeView === 'history' && (
                <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', color: '#1e293b' }}>
                    <span style={{ fontSize: '1.5rem' }}>📜</span> Your Feedback History
                </h2>
                {history.length === 0 ? <p>No feedback submitted yet.</p> : (
                    <div className="table-container">
                        <table className="table">
                        <thead>
                            <tr>
                                 <th style={{ whiteSpace: 'nowrap' }}>DATE</th>
                                 <th style={{ whiteSpace: 'nowrap' }}>EMOTION</th>
                                 <th>INTENSITY</th>
                                 <th style={{ minWidth: '200px' }}>DOMAIN & TRIGGERS</th>
                                 <th>COMMENT</th>
                                 <th style={{ whiteSpace: 'nowrap' }}>SOS SUPPORT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(item => (
                                <tr key={item.id || item._id || Math.random()}>
                                    <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{item.date || '--'}</td>
                                    <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                         <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                             {item.emotion === 'Happy' && '😊'}
                                             {item.emotion === 'Stressed' && '😫'}
                                             {item.emotion === 'Anxious' && '😰'}
                                             {item.emotion === 'Neutral' && '😐'}
                                             {item.emotion === 'Sad' && '😢'}
                                             {item.emotion}
                                         </span>
                                     </td>
                                    <td style={{ verticalAlign: 'top', fontWeight: 600, color: '#475569' }}>{item.emotion_intensity ? `${item.emotion_intensity}/5` : '--'}</td>
                                    <td style={{ verticalAlign: 'top', fontSize: '0.85rem', lineHeight: '1.6' }}>
                                        {item.emotion === 'Happy' ? (
                                             <>
                                                 <div><strong style={{ color: '#1e293b' }}>Domain:</strong> {item.emotion_domain || 'General Happiness'}</div>
                                                 {item.outcome_of_happiness && <div><strong style={{ color: '#1e293b' }}>Outcome:</strong> {item.outcome_of_happiness}</div>}
                                             </>
                                        ) : (
                                            <>
                                                <div><strong style={{ color: '#1e293b' }}>Domain:</strong> {item.emotion_domain || item.reason || '--'}</div>
                                                {item.emotion_triggers && item.emotion_triggers.length > 0 && (
                                                    <div style={{ marginTop: '4px' }}>
                                                        <strong style={{ color: '#1e293b' }}>Triggers:</strong>{' '}
                                                        {Array.isArray(item.emotion_triggers) ? item.emotion_triggers.join(', ') : item.emotion_triggers}
                                                    </div>
                                                )}
                                                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', color: '#64748b' }}>
                                                    <span><strong style={{ color: '#1e293b' }}>Impact:</strong> {item.life_impact_score ? `${item.life_impact_score}/5` : '--'}</span>
                                                    <span>|</span>
                                                    <span><strong style={{ color: '#1e293b' }}>Duration:</strong> {item.emotion_duration || '--'}</span>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td style={{ verticalAlign: 'top', fontStyle: item.comment ? 'normal' : 'italic', color: item.comment ? '#334155' : '#94a3b8' }}>
                                        {item.comment || 'No comment provided'}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                        {/* SOS Support Column */}
                                        <span style={{ 
                                            fontWeight: 700, 
                                            fontSize: '0.85rem',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: item.helpRequested ? '#f0fdf4' : '#fef2f2',
                                            color: item.helpRequested ? '#16a34a' : '#dc2626',
                                            border: `1px solid ${item.helpRequested ? '#bbf7d0' : '#fecaca'}`
                                        }}>
                                            {item.helpRequested ? 'YES' : 'NO'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
                </div>
            )}

            {/* Your Counselling Progress Table */}
            {activeView === 'counselling_progress' && (
                history.some(item => item.helpRequested || item.assignedFacultyName || item.assignedMentor || item.meetingVenue || item.meetingTimeSlot) ? (
                    <div className="card" style={{ marginTop: '30px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', color: '#1e293b' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧑‍🏫</span> Your Counselling Progress
                        </h2>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ whiteSpace: 'nowrap' }}>DATE OF REQUEST</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>SOS STATUS</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>ALLOCATED FACULTY</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>VENUE & TIME</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>SESSION STATUS</th>
                                    <th style={{ minWidth: '300px' }}>FACULTY COUNSELLING RECORDS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history
                                    .filter(item => item.helpRequested || item.assignedFacultyName || item.assignedMentor || item.meetingVenue || item.meetingTimeSlot)
                                    .map(item => (
                                    <tr key={item.id || item._id || Math.random()}>
                                        <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{item.date || '--'}</td>
                                        <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                            <span style={{ 
                                                fontWeight: 700, 
                                                fontSize: '0.85rem',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: item.helpRequested ? '#f0fdf4' : '#fef2f2',
                                                color: item.helpRequested ? '#16a34a' : '#dc2626',
                                                border: `1px solid ${item.helpRequested ? '#bbf7d0' : '#fecaca'}`
                                            }}>
                                                {item.helpRequested ? 'YES' : 'NO'}
                                            </span>
                                        </td>
                                        <td style={{ verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                {item.assignedFacultyName || item.assignedMentor || (item.assignedFacultyEmail ? item.assignedFacultyEmail.split('@')[0] : '--')}
                                            </div>
                                            {item.assignedFacultyEmail && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.assignedFacultyEmail}</div>}
                                        </td>
                                        <td style={{ verticalAlign: 'top' }}>
                                            {/* Venue / Meeting Link Column */}
                                            <div style={{ marginBottom: '4px' }}>
                                                {item.meetingVenue ? (
                                                    item.meetingMode === 'online' ? (
                                                        <a href={item.meetingVenue.startsWith('http') ? item.meetingVenue : `https://${item.meetingVenue}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.85rem', fontWeight: 600 }}>
                                                            🔗 Join Online Meeting
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>📍 {item.meetingVenue}</span>
                                                    )
                                                ) : <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Venue TBD</span>}
                                            </div>
                                            {/* Time Column */}
                                            {item.meetingTimeSlot ? (
                                                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                                    🕐 {new Date(item.meetingTimeSlot).toLocaleString()}
                                                </div>
                                            ) : <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Time TBD</div>}
                                        </td>
                                        <td style={{ verticalAlign: 'top' }}>
                                           {/* Session Status Column */}
                                           <span style={{
                                               display: 'inline-block',
                                               fontSize: '0.75rem',
                                               padding: '4px 10px',
                                               borderRadius: '8px',
                                               fontWeight: 'bold',
                                               textTransform: 'uppercase',
                                               letterSpacing: '0.05em',
                                               backgroundColor: item.status === 'resolved' ? '#ecfdf5' : 
                                                              (['allocated', 'ongoing', 'yet_to_meet'].includes(item.status) ? '#eff6ff' : '#f8fafc'),
                                               border: `1px solid ${item.status === 'resolved' ? '#10b981' : 
                                                                 (['allocated', 'ongoing', 'yet_to_meet'].includes(item.status) ? '#3b82f6' : '#e2e8f0')}`,
                                               color: item.status === 'resolved' ? '#059669' : 
                                                      (['allocated', 'ongoing', 'yet_to_meet'].includes(item.status) ? '#1d4ed8' : '#64748b')
                                           }}>
                                               {item.status === 'resolved' ? 'Completed' : 
                                                (item.status === 'allocated' || item.status === 'yet_to_meet' ? 'Scheduled' : 
                                                 (item.status === 'ongoing' ? 'Ongoing' : (item.status === 'pending' ? 'Pending' : 'N/A')))}
                                           </span>
                                        </td>
                                        <td style={{ minWidth: '300px', fontSize: '0.85rem', color: '#475569', verticalAlign: 'top' }}>
                                            {/* Faculty Feedback (fetched from each counselling session) */}
                                            {(() => {
                                                if (!counsellingSessions || counsellingSessions.length === 0) {
                                                    return <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>{item.faculty_feedback || 'No counselling records yet.'}</span>;
                                                }
                                                
                                                // Find sessions assigned to this specific faculty
                                                const relatedSessions = counsellingSessions.filter(session => {
                                                    const facultyEmail = session.faculty_id?.email || '';
                                                    return item.assignedFacultyEmail && facultyEmail.toLowerCase() === item.assignedFacultyEmail.toLowerCase();
                                                }).sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
    
                                                if (relatedSessions.length === 0) {
                                                    return <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>{item.faculty_feedback || 'No detailed counselling records yet.'}</span>;
                                                }
    
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {relatedSessions.map((session, index) => (
                                                            <div key={session._id} style={{
                                                                background: '#fff',
                                                                padding: '12px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
                                                                        Session {index + 1}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                        {new Date(session.session_date).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'grid', gap: '8px' }}>
                                                                    {session.concern && <div><strong style={{ color: '#1e293b', fontSize: '0.8rem' }}>Concern:</strong> {session.concern}</div>}
                                                                    {session.discussion_summary && <div><strong style={{ color: '#1e293b', fontSize: '0.8rem' }}>Summary:</strong> {session.discussion_summary}</div>}
                                                                    {session.advice && <div><strong style={{ color: '#1e293b', fontSize: '0.8rem' }}>Insight/Advice:</strong> {session.advice}</div>}
                                                                    <div>
                                                                        <strong style={{ color: '#1e293b', fontSize: '0.8rem' }}>Faculty Remarks:</strong><br />
                                                                        <span style={{ fontStyle: 'italic', color: '#334155' }}>{session.faculty_feedback || 'No specific remarks.'}</span>
                                                                    </div>
                                                                    {session.action_plan && <div><strong style={{ color: '#1e293b', fontSize: '0.8rem' }}>Action Plan:</strong> {session.action_plan}</div>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
                        <span style={{ fontSize: '3rem' }}>🧑‍🏫</span>
                        <h3>No Active Counselling Records</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Your counselling progress and scheduled meetings will appear here when you request help or are assigned a mentor.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default StudentDashboard;
