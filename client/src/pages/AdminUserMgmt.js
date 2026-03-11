import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';


const AdminUserMgmt = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const userList = await apiClient('/users');
            setUsers(userList);
            setFilteredUsers(userList);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        let result = users;
        if (searchTerm) {
            result = result.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (roleFilter !== 'all') {
            result = result.filter(u => u.role === roleFilter);
        }
        setFilteredUsers(result);
    }, [searchTerm, roleFilter, users]);

    const handleRoleChange = async (uid, newRole) => {
        try {
            await apiClient('/set-role', {
                method: 'POST',
                body: JSON.stringify({ uid, role: newRole })
            });
            alert('Role updated successfully!');
            fetchUsers();
        } catch (error) {
            alert('Error updating role: ' + error.message);
        }
    };

    const handleDelete = async (uid) => {
        if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
        try {
            await apiClient(`/users/${uid}`, { method: 'DELETE' });
            alert('User deleted successfully.');
            fetchUsers();
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    };

    return (
        <div className="card">
            <h2>User Management</h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '0.8rem', flex: 1, minWidth: '200px' }}
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ padding: '0.8rem', width: 'auto' }}
                >
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                </select>
                <button className="btn" onClick={fetchUsers}>Refresh</button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Current Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                <tr key={user.uid}>
                                    <td>{user.email}</td>
                                    <td><span style={{ fontWeight: 'bold' }}>{user.role || 'student'}</span></td>
                                    <td>
                                        <select
                                            value={user.role || 'student'}
                                            onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                                            style={{ padding: '5px', marginRight: '10px' }}
                                        >
                                            <option value="student">Student</option>
                                            <option value="faculty">Faculty</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <button
                                            className="btn btn-danger"
                                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                                            onClick={() => handleDelete(user.uid)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="3" style={{ textAlign: 'center' }}>No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUserMgmt;
