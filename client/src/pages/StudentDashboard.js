import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

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

    const validateDetails = () => {
        const { name, regno, department, batch, email, mobile, place } = studentDetails;
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isMobileValid = /^\d{10}$/.test(mobile);
        const isRegNoValid = /^[a-zA-Z0-9]+$/.test(regno);

        return name && regno && department && batch && email && mobile && place &&
            isEmailValid && isMobileValid && isRegNoValid;
    };

    const validateForm = () => {
        return detailsSubmitted && emotion && comment.trim();
    };

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setStudentDetails(prev => ({ ...prev, [name]: value }));
    };

    const fetchHistory = async () => {
        try {
            const data = await apiClient('/my-feedback');
            setHistory(data);
            if (data.length > 0) {
                setLastEmotion(data[0]);
            }
        } catch (error) {
            console.error("Error fetching history", error);
        }
    };

    useEffect(() => {
        fetchHistory();
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
                    helpRequested: requestHelp
                })
            });

            setMessage({ text: 'Feedback submitted successfully!', type: 'success' });
            setEmotion('');
            setEmotionIntensity(3);
            setRequestHelp(false);
            setComment('');
            fetchHistory();
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

    return (
        <div className="container" style={{ paddingTop: '20px' }}>

            {lastEmotion && (
                <div style={{
                    backgroundColor: '#fff',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    borderLeft: `4px solid ${getEmotionColor(lastEmotion.emotion)}`
                }}>
                    <strong>Last Check-in:</strong> {lastEmotion.emotion} <span style={{ fontSize: '0.8rem', color: '#666' }}>({lastEmotion.date})</span>
                </div>
            )}

            {/* Student Details Section */}
            <div className="card" style={{ marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px' }}>Student Details</h2>
                {detailsSubmitted ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', animation: 'fadeIn 0.5s' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>✅</div>
                        <h3 style={{ color: '#50c878', margin: '0 0 10px 0' }}>Details Registered</h3>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0' }}>
                            Your information has been saved. Please proceed with your emotional feedback below.
                        </p>
                    </div>
                ) : (
                    <>
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
                                <input type="email" name="email" value={studentDetails.email} onChange={handleDetailChange} placeholder="Valid email required" required />
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
                    </>
                )}
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '40px 0' }} />

            <div className={`card ${!detailsSubmitted ? 'disabled-section' : ''}`} style={{ opacity: detailsSubmitted ? 1 : 0.6, pointerEvents: detailsSubmitted ? 'auto' : 'none' }}>
                <h2 style={{ color: detailsSubmitted ? '#2c3e50' : '#94a3b8' }}>How are you feeling today?</h2>
                {!detailsSubmitted && <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Please submit your details first to unlock the feedback form.</p>}
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

            <div className="card">
                <h2>Your History</h2>
                {history.length === 0 ? <p>No feedback submitted yet.</p> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Emotion</th>
                                <th>Intensity</th>
                                <th>Current Status</th>
                                <th>Faculty/Mentor</th>
                                <th>Time & Venue</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(item => (
                                <tr key={item.id || item._id || Math.random()}>
                                    <td>{item.date}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: `${getEmotionColor(item.emotion)}20`,
                                            color: getEmotionColor(item.emotion),
                                            border: `1px solid ${getEmotionColor(item.emotion)}`,
                                            fontWeight: 'bold'
                                        }}>
                                            {item.emotion}
                                        </span>
                                    </td>
                                    <td>{item.emotion_intensity ? `${item.emotion_intensity} / 5` : '-'}</td>
                                    <td>
                                        {/* Current Status Column */}
                                        {item.helpRequested ? (
                                            <>
                                                {(!item.status || item.status === 'pending' || item.status === 'none') && (
                                                    <span style={{ color: '#d97706', fontWeight: 'bold' }}>
                                                        🆘 Pending
                                                    </span>
                                                )}
                                                {(['allocated', 'yet_to_meet', 'ongoing'].includes(item.status)) && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        backgroundColor: '#eff6ff',
                                                        border: '1px solid #bfdbfe',
                                                        color: '#1e40af',
                                                        textTransform: 'capitalize',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {item.status.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                                {item.status === 'resolved' && (
                                                    <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                                        Resolved
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {/* Faculty/Mentor Column */}
                                        {item.helpRequested ? (
                                            <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500' }}>
                                                {item.assignedFacultyName || item.assignedMentor || (item.assignedFacultyEmail ? item.assignedFacultyEmail.split('@')[0] : '—')}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {/* Time & Venue Column */}
                                        {(item.meetingTimeSlot || item.meetingVenue) ? (
                                            <div style={{
                                                padding: '8px',
                                                background: '#eff6ff',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                border: '1px solid #bfdbfe',
                                                maxWidth: '180px'
                                            }}>
                                                {item.meetingTimeSlot && <span>🕐 {new Date(item.meetingTimeSlot).toLocaleString()}<br /></span>}
                                                {item.meetingVenue && <span>📍 {item.meetingVenue}</span>}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>—</span>
                                        )}
                                    </td>
                                    <td>{item.comment}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
