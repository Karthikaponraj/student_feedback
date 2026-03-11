import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

const AssignMentorModal = ({ feedback, onClose, onAssign }) => {
    const [facultyUsers, setFacultyUsers] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState(''); // Stores the email string
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFaculty = async () => {
            try {
                // Fetch registered faculty users from our new endpoint
                const data = await apiClient('/faculty-users');
                setFacultyUsers(data);

                // If there are faculty users, we could pre-select one if needed
                // but usually better to leave empty for deliberate choice
            } catch (err) {
                console.error("Error fetching faculty users:", err);
                // Fallback for demo if API fails
                setFacultyUsers([
                    { name: 'Dr. Smith', email: 'smith@example.com', department: 'Psychology' },
                    { name: 'Prof. Johnson', email: 'johnson@example.com', department: 'Counseling' }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchFaculty();
    }, []);

    const handleSubmit = () => {
        if (selectedFaculty) {
            const faculty = facultyUsers.find(f => f.email === selectedFaculty);
            if (faculty) {
                // Pass both name and email back to parent
                onAssign(feedback._id || feedback.id, faculty.name, faculty.email);
            }
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white', padding: '30px', borderRadius: '16px',
                width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b' }}>Assign Faculty Mentor</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#334155' }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Student:</strong> {feedback.studentName || 'Unknown User'}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Email:</strong> {feedback.studentEmail || feedback.email}</p>
                    <p style={{ margin: 0 }}><strong>Request:</strong> <span style={{ fontStyle: 'italic', color: '#64748b' }}>"{feedback.comment || 'No comment'}"</span></p>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#334155' }}>
                        Select Registered Faculty:
                    </label>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '10px' }}>Loading faculty members...</div>
                    ) : facultyUsers.length === 0 ? (
                        <div style={{
                            padding: '15px',
                            backgroundColor: '#fff7ed',
                            border: '1px solid #ffedd5',
                            color: '#9a3412',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                        }}>
                            ⚠️ No faculty users found. Please register a faculty member or change a user's role to 'faculty' first.
                        </div>
                    ) : (
                        <select
                            value={selectedFaculty}
                            onChange={(e) => setSelectedFaculty(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #cbd5e1', fontSize: '1rem',
                                color: '#1e293b', backgroundColor: '#fff',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <option value="">-- Choose a Faculty Member --</option>
                            {facultyUsers.map((f, idx) => (
                                <option key={f.email || idx} value={f.email}>
                                    {f.name} ({f.email}) {f.department ? `- ${f.department}` : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                            backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', color: '#64748b'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedFaculty}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                            backgroundColor: !selectedFaculty ? '#cbd5e1' : '#4b6159',
                            color: 'white', cursor: !selectedFaculty ? 'not-allowed' : 'pointer',
                            fontWeight: '700', transition: 'all 0.2s'
                        }}
                    >
                        Confirm Assignment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignMentorModal;
