import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { userRole } = useAuth();

    // Derived state for unreadCount ensures it's always in sync
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const fetchNotifications = async () => {
        try {
            let endpoint = '/notifications/student';
            if (userRole === 'admin') endpoint = '/notifications/admin';
            else if (userRole === 'faculty') endpoint = '/notifications'; // Use generic endpoint for faculty

            const data = await apiClient(endpoint);
            setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    useEffect(() => {
        if (!userRole) return;
        fetchNotifications();
        // Poll every 60 seconds to reduce race conditions
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [userRole]);

    const markAsRead = async (id) => {
        console.log("🔔 [Frontend] Marking single notification read:", id);
        // Optimistic Update
        setNotifications(prev => prev.map(n =>
            (n._id === id || n.id === id) ? { ...n, isRead: true } : n
        ));

        try {
            await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
        } catch (error) {
            console.error("Error marking as read:", error);
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        console.log("🔔 [Frontend] Marking ALL notifications read");
        // Fully Optimistic Update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        try {
            const result = await apiClient('/notifications/read-all', { method: 'PATCH' });
            console.log("🔔 [Backend] Mark all result:", result);
        } catch (error) {
            console.error("Error marking all as read:", error);
            fetchNotifications();
        }
    };

    const deleteNotification = async (e, id) => {
        e.stopPropagation(); // Prevent dropdown item click
        console.log("🔔 [Frontend] Deleting notification:", id);

        // Optimistic Delete
        setNotifications(prev => prev.filter(n => (n._id !== id && n.id !== id)));

        try {
            await apiClient(`/notifications/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error("Error deleting notification:", error);
            fetchNotifications();
        }
    };

    const handleNotificationClick = async (notif) => {
        // Mark as read immediately if not already read
        if (!notif.isRead) {
            await markAsRead(notif._id);
        }

        // Feature: Scroll to help requests if admin clicks a help request notification
        if (userRole === 'admin' && notif.type === 'help_request') {
            setIsOpen(false);
            // We assume the caller might be on a different page or we need to ensure section exists
            const element = document.getElementById('help-requests-management') || document.getElementById('analytics-section');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                element.style.backgroundColor = '#fffdef';
                setTimeout(() => element.style.backgroundColor = 'transparent', 2000);
            }
        }
    };

    const toggleDropdown = () => setIsOpen(!isOpen);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div style={{ position: 'relative', marginRight: '20px', display: 'inline-block' }} ref={dropdownRef}>
            <div onClick={toggleDropdown} style={{ cursor: 'pointer', position: 'relative', padding: '5px' }}>
                <span style={{ fontSize: '1.4rem' }}>🔔</span>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        boxShadow: '0 0 0 2px white',
                        animation: 'pulse 2s infinite'
                    }}>
                        {unreadCount}
                    </span>
                )}
                <style>
                    {`
                        @keyframes pulse {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.1); }
                            100% { transform: scale(1); }
                        }
                    `}
                </style>
            </div>

            {isOpen && (
                <div className="notif-dropdown" style={{
                    position: 'absolute',
                    right: 0,
                    top: '45px',
                    width: '320px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    zIndex: 1000,
                    maxHeight: '450px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #edf2f7',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h4 style={{ margin: '0', fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b' }}>
                            Notifications
                        </h4>
                        {unreadCount > 0 && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    onClick={markAllAsRead}
                                    style={{ background: 'none', border: 'none', color: '#394d46', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}
                                >
                                    Mark all as read
                                </button>
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: '#394d46',
                                    fontWeight: '600',
                                    backgroundColor: '#f9fafb',
                                    padding: '2px 8px',
                                    borderRadius: '10px'
                                }}>
                                    {unreadCount} new
                                </span>
                            </div>
                        )}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
                                <div style={{ fontSize: '0.9rem' }}>No notifications yet</div>
                            </div>
                        ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {notifications.map(notif => (
                                    <li key={notif._id || notif.id} className="notif-item" style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f1f5f9',
                                        backgroundColor: notif.isRead ? 'white' : '#f9fafb',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        borderLeft: notif.isRead ? '4px solid transparent' : '4px solid #394d46',
                                        opacity: notif.isRead ? 0.8 : 1,
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{
                                                fontWeight: notif.isRead ? '500' : '700',
                                                fontSize: '0.85rem',
                                                marginBottom: '2px',
                                                color: notif.isRead ? '#64748b' : '#1e293b',
                                                flex: 1,
                                                paddingRight: '24px'
                                            }}>
                                                {notif.isRead ? '' : '🔵 '}{notif.title}
                                            </div>
                                            <button
                                                className="notif-delete-btn"
                                                onClick={(e) => deleteNotification(e, notif._id || notif.id)}
                                                title="Delete notification"
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '12px',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4', paddingRight: '20px' }}>
                                            {notif.message}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                                            <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <style>
                                            {`
                                                .notif-item:hover {
                                                    background-color: ${notif.isRead ? '#f8fafc' : '#f3f4f6'} !important;
                                                }
                                                .notif-item .notif-delete-btn {
                                                    opacity: 0;
                                                }
                                                .notif-item:hover .notif-delete-btn {
                                                    opacity: 1;
                                                }
                                                .notif-delete-btn:hover {
                                                    color: #ef4444 !important;
                                                    background-color: #fee2e2 !important;
                                                }
                                            `}
                                        </style>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <div style={{ padding: '8px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#394d46', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' }}
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
