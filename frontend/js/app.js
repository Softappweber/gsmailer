// =====================================================
// GS Mailer - Main Application
// =====================================================

const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentPage = 'dashboard';

// =====================================================
// Auth Functions
// =====================================================

async function login(email, password) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        localStorage.setItem('token', data.session.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        currentUser = data.user;
        showApp();
        loadPage('dashboard');
        showToast('Welcome back!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function signup(name, email, password) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
        }
        
        localStorage.setItem('token', data.session.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        currentUser = data.user;
        showApp();
        loadPage('dashboard');
        showToast('Account created! Welcome to GS Mailer.', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showLogin();
    showToast('Logged out', 'info');
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showApp();
        loadPage('dashboard');
        return true;
    }
    
    showLogin();
    return false;
}

// =====================================================
// UI Helpers
// =====================================================

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('userEmail').textContent = currentUser?.email || '';
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || (() => {
        const div = document.createElement('div');
        div.id = 'toastContainer';
        div.className = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToken() {
    return localStorage.getItem('token');
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

// =====================================================
// Navigation
// =====================================================

function loadPage(page) {
    currentPage = page;
    
    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        campaigns: 'Campaigns',
        contacts: 'Contacts',
        templates: 'Templates',
        settings: 'Settings'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
    
    // Load page content
    const content = document.getElementById('page-content');
    
    switch(page) {
        case 'dashboard':
            loadDashboard(content);
            break;
        case 'campaigns':
            loadCampaigns(content);
            break;
        case 'contacts':
            loadContacts(content);
            break;
        case 'templates':
            loadTemplates(content);
            break;
        case 'settings':
            loadSettings(content);
            break;
        default:
            content.innerHTML = '<h2>Page not found</h2>';
    }
}

// =====================================================
// Page: Dashboard
// =====================================================

async function loadDashboard(container) {
    showLoading(true);
    try {
        // Get contacts
        const contacts = await apiRequest('/contacts?limit=1000');
        
        // Get campaigns
        const campaigns = await apiRequest('/campaigns');
        
        // Calculate stats
        const totalContacts = contacts.total || 0;
        const sent = contacts.data?.filter(c => c.status === 'Sent').length || 0;
        const clicks = contacts.data?.filter(c => c.website_clicked).length || 0;
        const bounces = contacts.data?.filter(c => c.bounce_status).length || 0;
        const replies = contacts.data?.filter(c => c.reply_status).length || 0;
        
        const clickRate = sent > 0 ? Math.round((clicks / sent) * 100) : 0;
        const bounceRate = sent > 0 ? Math.round((bounces / sent) * 100) : 0;
        
        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Total Contacts</div>
                    <div class="kpi-value primary">${totalContacts}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Emails Sent</div>
                    <div class="kpi-value primary">${sent}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Website Clicks</div>
                    <div class="kpi-value success">${clicks}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Click Rate</div>
                    <div class="kpi-value ${clickRate > 20 ? 'success' : 'warning'}">${clickRate}%</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Bounces</div>
                    <div class="kpi-value danger">${bounces}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Replies</div>
                    <div class="kpi-value success">${replies}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Bounce Rate</div>
                    <div class="kpi-value ${bounceRate > 10 ? 'danger' : 'success'}">${bounceRate}%</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Campaigns</div>
                    <div class="kpi-value primary">${campaigns.length || 0}</div>
                </div>
            </div>
            
            ${campaigns.length > 0 ? `
                <div class="card">
                    <div class="card-title">📊 Recent Campaigns</div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Campaign</th>
                                    <th>Sent</th>
                                    <th>Clicks</th>
                                    <th>Click Rate</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${campaigns.slice(0, 5).map(c => `
                                    <tr>
                                        <td><strong>${c.name}</strong></td>
                                        <td>${c.total_sent || 0}</td>
                                        <td>${c.total_clicks || 0}</td>
                                        <td>${c.total_sent > 0 ? Math.round((c.total_clicks / c.total_sent) * 100) : 0}%</td>
                                        <td><span class="badge ${c.enabled ? 'badge-success' : 'badge-secondary'}">${c.enabled ? 'Active' : 'Draft'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : `
                <div class="card" style="text-align:center;padding:40px;">
                    <p style="font-size:18px;color:var(--text-secondary);">🚀 No campaigns yet</p>
                    <p style="color:var(--text-secondary);">Create your first campaign to get started.</p>
                    <button class="btn btn-primary" onclick="navigateTo('campaigns')" style="margin-top:16px;">Create Campaign</button>
                </div>
            `}
        `;
    } catch (err) {
        container.innerHTML = `<div class="card"><p>Error loading dashboard: ${err.message}</p></div>`;
    } finally {
        showLoading(false);
    }
}

// =====================================================
// Page: Campaigns
// =====================================================

async function loadCampaigns(container) {
    showLoading(true);
    try {
        const campaigns = await apiRequest('/campaigns');
        
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h2 style="font-size:20px;">Campaigns</h2>
                <button class="btn btn-primary" onclick="showCreateCampaign()">+ New Campaign</button>
            </div>
            
            ${campaigns.length > 0 ? `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Campaign</th>
                                <th>Subject A</th>
                                <th>Subject B</th>
                                <th>Sent</th>
                                <th>Clicks</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${campaigns.map(c => `
                                <tr>
                                    <td><strong>${c.name}</strong></td>
                                    <td>${c.subject_a}</td>
                                    <td>${c.subject_b || '-'}</td>
                                    <td>${c.total_sent || 0}</td>
                                    <td>${c.total_clicks || 0}</td>
                                    <td><span class="badge ${c.enabled ? 'badge-success' : 'badge-secondary'}">${c.enabled ? 'Active' : 'Draft'}</span></td>
                                    <td>
                                        <button class="btn btn-primary" style="padding:4px 12px;font-size:12px;" onclick="sendCampaign('${c.id}')">Send</button>
                                        <button class="btn btn-secondary" style="padding:4px 12px;font-size:12px;" onclick="editCampaign('${c.id}')">Edit</button>
                                        <button class="btn btn-danger" style="padding:4px 12px;font-size:12px;" onclick="deleteCampaign('${c.id}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="card" style="text-align:center;padding:60px;">
                    <p style="font-size:18px;color:var(--text-secondary);">📧 No campaigns yet</p>
                    <p style="color:var(--text-secondary);">Create your first email campaign.</p>
                    <button class="btn btn-primary" onclick="showCreateCampaign()" style="margin-top:16px;">Create Campaign</button>
                </div>
            `}
        `;
    } catch (err) {
        container.innerHTML = `<div class="card"><p>Error loading campaigns: ${err.message}</p></div>`;
    } finally {
        showLoading(false);
    }
}

async function sendCampaign(campaignId) {
    if (!confirm('Send this campaign now?')) return;
    
    showLoading(true);
    try {
        const result = await apiRequest(`/campaigns/${campaignId}/send`, {
            method: 'POST'
        });
        
        showToast(`Sent ${result.sent} emails. ${result.errors.length > 0 ? result.errors.length + ' errors.' : ''}`, 
                  result.errors.length > 0 ? 'warning' : 'success');
        loadPage('campaigns');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteCampaign(campaignId) {
    if (!confirm('Delete this campaign?')) return;
    
    showLoading(true);
    try {
        await apiRequest(`/campaigns/${campaignId}`, { method: 'DELETE' });
        showToast('Campaign deleted', 'success');
        loadPage('campaigns');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// Page: Contacts
// =====================================================

async function loadContacts(container) {
    showLoading(true);
    try {
        const contacts = await apiRequest('/contacts?limit=1000');
        const campaigns = await apiRequest('/contacts/campaigns/list');
        
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
                <h2 style="font-size:20px;">Contacts (${contacts.total || 0})</h2>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="showImportContacts()">📥 Import CSV</button>
                    <button class="btn btn-secondary" onclick="exportContacts()">📤 Export CSV</button>
                    <button class="btn btn-secondary" onclick="checkDuplicates()">🔍 Check Duplicates</button>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Lead ID</th>
                            <th>Name</th>
                            <th>Company</th>
                            <th>Email</th>
                            <th>Campaign</th>
                            <th>Status</th>
                            <th>Clicked</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${contacts.data && contacts.data.length > 0 ? contacts.data.map(c => `
                            <tr>
                                <td><code>${c.lead_id}</code></td>
                                <td>${c.first_name || '-'}</td>
                                <td>${c.company || '-'}</td>
                                <td>${c.email}</td>
                                <td>${c.campaign || '-'}</td>
                                <td><span class="badge ${c.status === 'Sent' ? 'badge-success' : c.status === 'Failed' ? 'badge-danger' : 'badge-secondary'}">${c.status || 'New'}</span></td>
                                <td>${c.website_clicked ? '✅' : '❌'}</td>
                                <td>
                                    <button class="btn btn-secondary" style="padding:2px 10px;font-size:12px;" onclick="viewContact('${c.id}')">View</button>
                                    <button class="btn btn-danger" style="padding:2px 10px;font-size:12px;" onclick="deleteContact('${c.id}')">✕</button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary);">No contacts yet. Import a CSV to get started.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="card"><p>Error loading contacts: ${err.message}</p></div>`;
    } finally {
        showLoading(false);
    }
}

async function deleteContact(contactId) {
    if (!confirm('Delete this contact?')) return;
    
    showLoading(true);
    try {
        await apiRequest(`/contacts/${contactId}`, { method: 'DELETE' });
        showToast('Contact deleted', 'success');
        loadPage('contacts');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function checkDuplicates() {
    showLoading(true);
    try {
        const result = await apiRequest('/contacts/duplicates/check');
        if (result.duplicates === 0) {
            showToast('No duplicate emails found!', 'success');
        } else {
            showToast(`Found ${result.duplicates} duplicate emails.`, 'warning');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function exportContacts() {
    showLoading(true);
    try {
        const token = getToken();
        window.open(`${API_URL}/contacts/export?token=${token}`, '_blank');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// Page: Templates
// =====================================================

async function loadTemplates(container) {
    showLoading(true);
    try {
        const templates = await apiRequest('/templates');
        
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h2 style="font-size:20px;">Email Templates</h2>
                <button class="btn btn-primary" onclick="showCreateTemplate()">+ New Template</button>
            </div>
            
            ${templates.length > 0 ? `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Subject</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${templates.map(t => `
                                <tr>
                                    <td><strong>${t.name}</strong></td>
                                    <td>${t.subject || '-'}</td>
                                    <td>${t.is_followup ? 'Follow-up' : 'Main'}</td>
                                    <td>
                                        <button class="btn btn-secondary" style="padding:2px 10px;font-size:12px;" onclick="previewTemplate('${t.id}')">Preview</button>
                                        <button class="btn btn-danger" style="padding:2px 10px;font-size:12px;" onclick="deleteTemplate('${t.id}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="card" style="text-align:center;padding:60px;">
                    <p style="font-size:18px;color:var(--text-secondary);">📝 No templates yet</p>
                    <p style="color:var(--text-secondary);">Create your first email template.</p>
                    <button class="btn btn-primary" onclick="showCreateTemplate()" style="margin-top:16px;">Create Template</button>
                </div>
            `}
        `;
    } catch (err) {
        container.innerHTML = `<div class="card"><p>Error loading templates: ${err.message}</p></div>`;
    } finally {
        showLoading(false);
    }
}

// =====================================================
// Page: Settings
// =====================================================

async function loadSettings(container) {
    showLoading(true);
    try {
        const settings = await apiRequest('/settings');
        
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });
        
        container.innerHTML = `
            <h2 style="font-size:20px;margin-bottom:20px;">⚙️ Settings</h2>
            
            <div class="card" style="max-width:600px;">
                <form id="settingsForm" onsubmit="saveSettings(event)">
                    <div class="form-group">
                        <label>Daily Email Limit</label>
                        <input type="number" class="form-control" name="DAILY_LIMIT" value="${settingsMap['DAILY_LIMIT'] || 20}" min="1" max="500">
                        <small style="color:var(--text-secondary);">Number of emails to send per day</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Wait Time (ms)</label>
                        <input type="number" class="form-control" name="WAIT_TIME" value="${settingsMap['WAIT_TIME'] || 3000}" min="500">
                        <small style="color:var(--text-secondary);">Delay between emails</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Sender Name</label>
                        <input type="text" class="form-control" name="SENDER_NAME" value="${settingsMap['SENDER_NAME'] || 'GS Mailer'}">
                    </div>
                    
                    <div class="form-group">
                        <label>Job Title</label>
                        <input type="text" class="form-control" name="JOB_TITLE" value="${settingsMap['JOB_TITLE'] || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Follow-up Day 1</label>
                        <input type="number" class="form-control" name="FOLLOWUP_DAYS_1" value="${settingsMap['FOLLOWUP_DAYS_1'] || 3}" min="1">
                    </div>
                    
                    <div class="form-group">
                        <label>Follow-up Day 2</label>
                        <input type="number" class="form-control" name="FOLLOWUP_DAYS_2" value="${settingsMap['FOLLOWUP_DAYS_2'] || 7}" min="1">
                    </div>
                    
                    <div class="form-group">
                        <label>Follow-up Day 3</label>
                        <input type="number" class="form-control" name="FOLLOWUP_DAYS_3" value="${settingsMap['FOLLOWUP_DAYS_3'] || 14}" min="1">
                    </div>
                    
                    <div class="form-group">
                        <label>Send Hour</label>
                        <input type="number" class="form-control" name="SEND_HOUR" value="${settingsMap['SEND_HOUR'] || 9}" min="0" max="23">
                        <small style="color:var(--text-secondary);">Hour (0-23) for daily scheduled sends</small>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Save Settings</button>
                </form>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="card"><p>Error loading settings: ${err.message}</p></div>`;
    } finally {
        showLoading(false);
    }
}

async function saveSettings(event) {
    event.preventDefault();
    showLoading(true);
    
    try {
        const formData = new FormData(event.target);
        const settings = [];
        
        for (const [key, value] of formData.entries()) {
            settings.push({ key, value });
        }
        
        await apiRequest('/settings', {
            method: 'PUT',
            body: JSON.stringify({ settings })
        });
        
        showToast('Settings saved!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// Navigation Helper
// =====================================================

function navigateTo(page) {
    loadPage(page);
}

// =====================================================
// Event Listeners
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });
    
    document.getElementById('signupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        signup(name, email, password);
    });
    
    // Toggle auth forms
    document.getElementById('showSignup').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-box:first-child').style.display = 'none';
        document.getElementById('signupBox').style.display = 'block';
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-box:first-child').style.display = 'block';
        document.getElementById('signupBox').style.display = 'none';
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) {
                // Close mobile sidebar
                document.getElementById('sidebar').classList.remove('open');
                loadPage(page);
            }
        });
    });
    
    // Mobile toggle
    document.getElementById('mobileToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('mobileToggle');
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
    
    // Check authentication
    checkAuth();
});

// =====================================================
// Placeholder functions (to be implemented)
// =====================================================

function showCreateCampaign() {
    showToast('Campaign creation coming soon!', 'info');
}

function editCampaign(id) {
    showToast('Campaign editing coming soon!', 'info');
}

function showImportContacts() {
    // Create a simple file upload modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'importModal';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-title">📥 Import Contacts</div>
            <form id="importForm">
                <div class="form-group">
                    <label>CSV File</label>
                    <input type="file" id="csvFile" accept=".csv" class="form-control">
                </div>
                <div class="form-group">
                    <label>Campaign</label>
                    <select id="campaignSelect" class="form-control">
                        <option value="">Select Campaign</option>
                    </select>
                </div>
                <div id="mappingContainer"></div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('importModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Import</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Load campaigns
    apiRequest('/contacts/campaigns/list')
        .then(campaigns => {
            const select = document.getElementById('campaignSelect');
            campaigns.forEach(c => {
                const option = document.createElement('option');
                option.value = c;
                option.textContent = c;
                select.appendChild(option);
            });
        });
    
    // Handle CSV file selection
    document.getElementById('csvFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const lines = text.split('\n');
        const header = lines[0].split(',').map(h => h.trim());
        
        // Auto-map header
        const response = await apiRequest('/contacts/csv/map', {
            method: 'POST',
            body: JSON.stringify({ header })
        });
        
        let html = '<h4>Column Mapping</h4><table style="width:100%;margin:12px 0;">';
        response.header.forEach(col => {
            html += `
                <tr>
                    <td style="padding:4px;">${col}</td>
                    <td style="padding:4px;">
                        <select class="form-control" style="width:auto;" data-column="${col}">
                            <option value="IGNORE" ${response.mapping[col] === 'IGNORE' ? 'selected' : ''}>IGNORE</option>
                            <option value="FIRST_NAME" ${response.mapping[col] === 'FIRST_NAME' ? 'selected' : ''}>FIRST_NAME</option>
                            <option value="COMPANY" ${response.mapping[col] === 'COMPANY' ? 'selected' : ''}>COMPANY</option>
                            <option value="EMAIL" ${response.mapping[col] === 'EMAIL' ? 'selected' : ''}>EMAIL</option>
                            <option value="WEBSITE" ${response.mapping[col] === 'WEBSITE' ? 'selected' : ''}>WEBSITE</option>
                            <option value="CAMPAIGN" ${response.mapping[col] === 'CAMPAIGN' ? 'selected' : ''}>CAMPAIGN</option>
                        </select>
                    </td>
                </tr>
            `;
        });
        html += '</table>';
        
        document.getElementById('mappingContainer').innerHTML = html;
        window._csvText = text;
    });
    
    document.getElementById('importForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        
        try {
            const campaign = document.getElementById('campaignSelect').value;
            const mapping = {};
            
            document.querySelectorAll('[data-column]').forEach(select => {
                mapping[select.dataset.column] = select.value;
            });
            
            const result = await apiRequest('/contacts/import', {
                method: 'POST',
                body: JSON.stringify({
                    csvText: window._csvText,
                    mapping,
                    campaign
                })
            });
            
            closeModal('importModal');
            showToast(`Imported ${result.imported} contacts. ${result.duplicates} duplicates skipped.`, 'success');
            loadPage('contacts');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            showLoading(false);
        }
    });
}

function showCreateTemplate() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'templateModal';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:800px;">
            <div class="modal-title">📝 Create Template</div>
            <form id="templateForm">
                <div class="form-group">
                    <label>Template Name *</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="form-group">
                    <label>Subject</label>
                    <input type="text" class="form-control" name="subject">
                </div>
                <div class="form-group">
                    <label>HTML Content *</label>
                    <textarea class="form-control" name="html_content" rows="12" required>Hello {{firstName}},
                        
I hope you are doing well.

<a href="{{website}}">Visit my website</a>

{{sender}}
{{title}}</textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="is_followup" value="true"> Is a follow-up template
                    </label>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('templateModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Template</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('templateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        
        try {
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                subject: formData.get('subject') || '',
                html_content: formData.get('html_content'),
                is_followup: formData.get('is_followup') === 'true'
            };
            
            await apiRequest('/templates', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            closeModal('templateModal');
            showToast('Template created!', 'success');
            loadPage('templates');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            showLoading(false);
        }
    });
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

// =====================================================
// Export functions for inline onclick
// =====================================================

window.navigateTo = navigateTo;
window.showCreateCampaign = showCreateCampaign;
window.showImportContacts = showImportContacts;
window.showCreateTemplate = showCreateTemplate;
window.sendCampaign = sendCampaign;
window.deleteCampaign = deleteCampaign;
window.deleteContact = deleteContact;
window.checkDuplicates = checkDuplicates;
window.exportContacts = exportContacts;
window.closeModal = closeModal;
window.saveSettings = saveSettings;
