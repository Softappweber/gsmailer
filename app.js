document.addEventListener('DOMContentLoaded', () => {
    console.log('App loaded');
    
    const token = localStorage.getItem('token');
    const loginScreen = document.getElementById('loginScreen');
    const app = document.getElementById('app');
    
    // Show login if no token
    if (!token || token === 'undefined' || token === 'null') {
        loginScreen.style.display = 'block';
        app.style.display = 'none';
    } else {
        loginScreen.style.display = 'none';
        app.style.display = 'block';
        loadDashboard();
    }
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Signup form
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    // Toggle login/signup
    document.getElementById('showSignup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupBox').style.display = 'block';
        document.getElementById('showSignup').parentElement.style.display = 'none';
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupBox').style.display = 'none';
        document.getElementById('showSignup').parentElement.style.display = 'block';
    });
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.token) {
            localStorage.setItem('token', response.token);
        } else if (response.session && response.session.access_token) {
            localStorage.setItem('token', response.session.access_token);
        } else {
            alert('Login failed: No token received');
            return;
        }
        
        if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            document.getElementById('userEmail').textContent = response.user.email;
        }
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        loadDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const response = await apiCall('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
        
        if (response.token) {
            localStorage.setItem('token', response.token);
        } else if (response.session && response.session.access_token) {
            localStorage.setItem('token', response.session.access_token);
        } else {
            alert('Signup failed: No token received');
            return;
        }
        
        if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            document.getElementById('userEmail').textContent = response.user.email;
        }
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        loadDashboard();
        
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    }
}

async function loadDashboard() {
    console.log('Loading dashboard...');
    
    try {
        const contacts = await apiCall('/api/contacts');
        
        const pageContent = document.getElementById('page-content');
        
        if (contacts && contacts.length > 0) {
            pageContent.innerHTML = contacts.map(contact => `
                <div class="contact-card">
                    <h3>${contact.name || 'No Name'}</h3>
                    <p>${contact.email}</p>
                </div>
            `).join('');
        } else {
            pageContent.innerHTML = '<p>No contacts found. Add your first contact!</p>';
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        document.getElementById('page-content').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
});
