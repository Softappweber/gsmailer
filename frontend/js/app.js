// =====================================================
// Main App JavaScript
// =====================================================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('App loaded');
    
    // Check if we're on the dashboard
    if (window.location.pathname.includes('dashboard')) {
        loadDashboard();
        return;
    }
    
    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

// =====================================================
// Handle Login
// =====================================================

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Attempting login for:', email);
    
    try {
        const response = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        // Store token
        if (response.token) {
            localStorage.setItem('token', response.token);
            console.log('Token stored successfully');
        } else if (response.session && response.session.access_token) {
            localStorage.setItem('token', response.session.access_token);
            console.log('Session token stored');
        } else {
            console.error('No token in response:', response);
            alert('Login failed: No token received');
            return;
        }
        
        // Store user data
        if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        // Redirect to dashboard
        window.location.href = './dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

// =====================================================
// Handle Signup
// =====================================================

async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name') ? document.getElementById('name').value : '';
    
    console.log('Attempting signup for:', email);
    
    try {
        const response = await apiCall('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
        
        // Store token
        if (response.token) {
            localStorage.setItem('token', response.token);
            console.log('Token stored successfully');
        } else if (response.session && response.session.access_token) {
            localStorage.setItem('token', response.session.access_token);
            console.log('Session token stored');
        } else {
            console.error('No token in response:', response);
            alert('Signup failed: No token received');
            return;
        }
        
        // Store user data
        if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        // Redirect to dashboard
        window.location.href = './dashboard.html';
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    }
}

// =====================================================
// Load Dashboard
// =====================================================

async function loadDashboard() {
    console.log('Loading dashboard...');
    
    const token = localStorage.getItem('token');
    console.log('Token available:', !!token);
    
    if (!token || token === 'undefined' || token === 'null') {
        console.error('No valid token found');
        window.location.href = './index.html';
        return;
    }
    
    try {
        // Test API connection
        const healthCheck = await fetch('https://gsmailer.onrender.com/health');
        console.log('Backend health:', await healthCheck.json());
        
        // Load contacts
        const contacts = await apiCall('/api/contacts');
        console.log('Contacts loaded:', contacts);
        
        // Display contacts
        const dashboardElement = document.getElementById('dashboard');
        if (dashboardElement) {
            if (contacts && contacts.length > 0) {
                dashboardElement.innerHTML = contacts.map(contact => `
                    <div class="contact-card">
                        <h3>${contact.name || 'No Name'}</h3>
                        <p>${contact.email}</p>
                    </div>
                `).join('');
            } else {
                dashboardElement.innerHTML = '<p>No contacts found. Add your first contact!</p>';
            }
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
        
        const dashboardElement = document.getElementById('dashboard');
        if (dashboardElement) {
            dashboardElement.innerHTML = `
                <div class="error-message">
                    <h3>Failed to load dashboard</h3>
                    <p>Error: ${error.message}</p>
                    <button onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }
}
