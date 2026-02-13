import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../utils/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for token in localStorage on load
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user'));
                if (storedUser) {
                    setCurrentUser(storedUser);
                    setUserRole(storedUser.role);
                }
            } catch (e) {
                console.error("Error parsing stored user", e);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password, role) => {
        try {
            const data = await apiClient('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });

            localStorage.setItem('token', data.token);
            const userObj = { id: data.userId, email, role: data.role, name: data.name };
            localStorage.setItem('user', JSON.stringify(userObj));

            setCurrentUser(userObj);
            setUserRole(data.role);

            return userObj;
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    const register = async (email, password, role = 'student', name = '') => {
        try {
            await apiClient('/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, role, name })
            });
            return true; // Success
        } catch (error) {
            console.error("Registration Error:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
        setUserRole(null);
        // Optional: Redirect to login or reload
        // window.location.href = '/login'; 
        return Promise.resolve();
    };

    const updateUser = (updatedUser) => {
        const newUser = { ...currentUser, ...updatedUser };
        localStorage.setItem('user', JSON.stringify(newUser));
        setCurrentUser(newUser);
    };

    const value = {
        currentUser,
        userRole,
        loading,
        login,
        register,
        logout,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
