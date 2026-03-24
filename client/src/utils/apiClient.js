
import API_URL from '../config';

/**
 * Standardized API client for all requests
 * Handles:
 * - Base URL prepending
 * - JSON headers
 * - Auth token injection
 * - Error standardization
 */
export const apiClient = async (endpoint, options = {}) => {
    const url = `${API_URL}/api${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Inject token if exists
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);

        // Try parsing JSON, but handle non-JSON responses gracefully
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        if (!response.ok) {
            // Handle unauthorized (expired token)
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Force reload to trigger AuthContext update and redirect to login
                window.location.href = '/login?expired=true';
            }

            // Throw standardized error object
            const error = new Error(data.message || `Request failed with status ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (error) {
        console.error(`API Request Error [${endpoint}]:`, error);

        // Normalize network errors (e.g., "Failed to fetch")
        if (error.message === 'Failed to fetch') {
            error.message = 'Unable to connect to the server. Please check your internet connection or try again later.';
        }

        throw error;
    }
};
