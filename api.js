// =====================================================
// API Client
// =====================================================

const API_URL = 'https://gsmailer.onrender.com';

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
    };
    
    if (token && token !== 'undefined' && token !== 'null') {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        console.log(`API Call: ${endpoint}`, options.method || 'GET');
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            mode: 'cors'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error Response:', errorData);
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`API Response from ${endpoint}:`, data);
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Export for use in other files
window.apiCall = apiCall;
