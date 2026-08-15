document.addEventListener('DOMContentLoaded', () => {
    console.log('App loaded');
    
    const token = localStorage.getItem('token');
    const loginScreen = document.getElementById('loginScreen');
    const app = document.getElementById('app');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    
    if (!token || token === 'undefined' || token === 'null') {
        if (loginScreen) loginScreen.style.display = 'block';
        if (app) app.style.display = 'none';
    } else {
        if (loginScreen) loginScreen.style.display = 'none';
        if (app) app.style.display = 'block';
        loadDashboard();
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    const showSignup = document.getElementById('showSignup');
    if (showSignup) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            const signupBox = document.getElementById('signupBox');
            if (signupBox) signupBox.style.display = 'block';
            showSignup.parentElement.style.display = 'none';
        });
    }
    
    const showLogin = document.getElementById('showLogin');
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            const signupBox = document.getElementById('signupBox');
            if (signupBox) signupBox.style.display = 'none';
            showLogin.parentElement.style.display = 'block';
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.reload();
        });
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) {
        console.error('Login inputs not found');
        return;
    }
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    console.log('Attempting login for:', email);
    
    try {
        const response = await fetch('https://gsmailer.onrender.com/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: email, password: password})
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showApp();
        } else if (data.session && data.session.access_token) {
            localStorage.setItem('token', data.session.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showApp();
        } else {
            alert('Login failed: ' + (data.error || 'No token received'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    
    if (!emailInput || !passwordInput) {
        console.error('Signup inputs not found');
        return;
    }
    
    const name = nameInput ? nameInput.value : '';
    const email = emailInput.value;
    const password = passwordInput.value;
    
    console.log('Attempting signup for:', email);
    
    try {
        const response = await fetch('https://gsmailer.onrender.com/api/auth/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: email, password: password, name: name})
        });
        
        const data = await response.json();
        console.log('Signup response:', data);
        
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showApp();
        } else if (data.session && data.session.access_token) {
            localStorage.setItem('token', data.session.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showApp();
        } else {
            alert('Signup failed: ' + (data.error || 'No token received'));
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    }
}

function showApp() {
    const loginScreen = document.getElementById('loginScreen');
    const app = document.getElementById('app');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'none';
    if (app) app.style.display = 'block';
    
    loadDashboard();
}

async function loadDashboard() {
    console.log('Loading dashboard...');
    
    const pageContent = document.getElementById('page-content');
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('https://gsmailer.onrender.com/api/contacts', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });
        
        const contacts = await response.json();
        console.log('Contacts:', contacts);
        
        if (pageContent) {
            if (contacts && contacts.length > 0) {
                pageContent.innerHTML = contacts.map(contact => `
                    <div class="contact-card">
                        <h3>${contact.name || 'No Name'}</h3>
                        <p>${contact.email}</p>
                    </div>
                `).join('');
            } else {
                pageContent.innerHTML = '<p>Welcome to GS Mailer! No contacts found.</p>';
            }
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        if (pageContent) {
            pageContent.innerHTML = '<p style="color:red;">Error loading dashboard: ' + error.message + '</p>';
        }
    }
}
