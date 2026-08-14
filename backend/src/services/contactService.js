// =====================================================
// Contact Service - Ported from CSV.js + Main.js
// =====================================================

const { supabase, supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const { Readable } = require('stream');

// =====================================================
// Field Aliases (from CSV.js)
// =====================================================

const FIELD_ALIASES = {
    EMAIL: ['email', 'email address', 'work email', 'business email'],
    COMPANY: ['company', 'company name', 'organization', 'business'],
    FIRST_NAME: ['first name', 'given name', 'firstname'],
    WEBSITE: ['website', 'website url', 'domain', 'url'],
    CAMPAIGN: ['campaign']
};

// =====================================================
// Auto-map CSV Header
// =====================================================

function autoMapHeader(header) {
    const mapping = {};
    
    header.forEach((column) => {
        const name = column.toLowerCase().trim();
        let found = 'IGNORE';
        
        for (const field in FIELD_ALIASES) {
            if (FIELD_ALIASES[field].includes(name)) {
                found = field;
                break;
            }
        }
        
        mapping[column] = found;
    });
    
    return mapping;
}

// =====================================================
// Email Validation
// =====================================================

function isValidEmail(email) {
    if (!email) return false;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

// =====================================================
// Generate Lead ID
// =====================================================

async function generateLeadID(userId) {
    const { data, error } = await supabase
        .from('contacts')
        .select('lead_id')
        .eq('user_id', userId)
        .order('lead_id', { ascending: false })
        .limit(1);
    
    if (error || !data || data.length === 0) {
        return 'L000001';
    }
    
    const lastID = data[0].lead_id;
    if (!lastID || !/^L\d+$/.test(lastID)) {
        return 'L000001';
    }
    
    const number = parseInt(lastID.substring(1), 10) + 1;
    return 'L' + number.toString().padStart(6, '0');
}

// =====================================================
// Get Existing Emails
// =====================================================

async function getExistingEmails(userId) {
    const { data, error } = await supabase
        .from('contacts')
        .select('email')
        .eq('user_id', userId);
    
    if (error) {
        throw new Error('Failed to fetch existing emails');
    }
    
    return new Set(data.map(row => row.email.toLowerCase().trim()));
}

// =====================================================
// Import Contacts from CSV
// =====================================================

async function importContacts(userId, csvText, mapping, campaign) {
    const results = {
        imported: 0,
        duplicates: 0,
        invalid: 0
    };
    
    const existingEmails = await getExistingEmails(userId);
    const leads = [];
    
    // Parse CSV
    const rows = [];
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        
        const lead = {
            firstName: '',
            company: '',
            email: '',
            website: '',
            campaign: campaign || ''
        };
        
        headers.forEach((header, index) => {
            const field = mapping[header];
            if (field === 'FIRST_NAME') lead.firstName = values[index] || '';
            else if (field === 'COMPANY') lead.company = values[index] || '';
            else if (field === 'EMAIL') lead.email = values[index] || '';
            else if (field === 'WEBSITE') lead.website = values[index] || '';
            else if (field === 'CAMPAIGN') lead.campaign = values[index] || '';
        });
        
        if (isValidEmail(lead.email)) {
            const email = lead.email.toLowerCase().trim();
            
            if (existingEmails.has(email)) {
                results.duplicates++;
            } else {
                lead.leadID = await generateLeadID(userId);
                leads.push(lead);
                existingEmails.add(email);
            }
        } else {
            results.invalid++;
        }
    }
    
    // Insert leads
    for (const lead of leads) {
        const { error } = await supabase
            .from('contacts')
            .insert({
                user_id: userId,
                lead_id: lead.leadID,
                first_name: lead.firstName,
                company: lead.company,
                email: lead.email.toLowerCase().trim(),
                website: lead.website,
                campaign: lead.campaign || campaign,
                status: 'New',
                lead_status: 'New',
                followup_stage: 0,
                bounce_processed: false
            });
        
        if (!error) {
            results.imported++;
        }
    }
    
    return results;
}

// =====================================================
// Get Contacts (with pagination)
// =====================================================

async function getContacts(userId, page = 1, limit = 50, filters = {}) {
    let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.campaign) {
        query = query.eq('campaign', filters.campaign);
    }
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.lead_status) {
        query = query.eq('lead_status', filters.lead_status);
    }
    if (filters.bounce_status !== undefined) {
        query = query.eq('bounce_status', filters.bounce_status);
    }
    if (filters.search) {
        const search = `%${filters.search}%`;
        query = query.or(`email.ilike.${search},first_name.ilike.${search},company.ilike.${search}`);
    }
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, count, error } = await query.range(from, to);
    
    if (error) {
        throw new Error('Failed to fetch contacts');
    }
    
    return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
}

// =====================================================
// Get Single Contact
// =====================================================

async function getContact(userId, contactId) {
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('id', contactId)
        .single();
    
    if (error) {
        throw new Error('Contact not found');
    }
    
    return data;
}

// =====================================================
// Update Contact
// =====================================================

async function updateContact(userId, contactId, updates) {
    const { data, error } = await supabase
        .from('contacts')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('id', contactId)
        .select()
        .single();
    
    if (error) {
        throw new Error('Failed to update contact');
    }
    
    return data;
}

// =====================================================
// Delete Contact
// =====================================================

async function deleteContact(userId, contactId) {
    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', userId)
        .eq('id', contactId);
    
    if (error) {
        throw new Error('Failed to delete contact');
    }
    
    return true;
}

// =====================================================
// Get Campaign List (for dropdown)
// =====================================================

async function getCampaignList(userId) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('name')
        .eq('user_id', userId)
        .eq('enabled', true)
        .order('name');
    
    if (error) {
        return [];
    }
    
    return data.map(row => row.name);
}

// =====================================================
// Check Duplicate Emails
// =====================================================

async function checkDuplicateEmails(userId) {
    const { data, error } = await supabase
        .from('contacts')
        .select('email')
        .eq('user_id', userId);
    
    if (error) {
        throw new Error('Failed to check duplicates');
    }
    
    const emailCount = {};
    const duplicates = [];
    
    data.forEach(row => {
        const email = row.email.toLowerCase().trim();
        emailCount[email] = (emailCount[email] || 0) + 1;
    });
    
    for (const email in emailCount) {
        if (emailCount[email] > 1) {
            duplicates.push({ email, count: emailCount[email] });
        }
    }
    
    return {
        total: data.length,
        duplicates: duplicates.length,
        duplicateEmails: duplicates
    };
}

// =====================================================
// Export Contacts to CSV
// =====================================================

async function exportContacts(userId) {
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new Error('Failed to export contacts');
    }
    
    if (!data || data.length === 0) {
        return null;
    }
    
    // Build CSV
    const headers = [
        'Lead ID', 'First Name', 'Company', 'Email', 'Subject', 'Website',
        'Campaign', 'Status', 'Sent On', 'Error', 'Lead Status', 'Notes',
        'Last Contact', 'Website Clicked', 'Click Time', 'AB Version', 'AB Click',
        'Last Email Date', 'Follow-up Stage', 'Bounce Status', 'Bounce Type',
        'Bounce Date', 'Bounce Reason', 'Retry Count', 'Bounce Processed',
        'Lead Score', 'Reply Status', 'Reply Date', 'Reply Content'
    ];
    
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = [
            row.lead_id || '',
            row.first_name || '',
            row.company || '',
            row.email || '',
            row.subject || '',
            row.website || '',
            row.campaign || '',
            row.status || '',
            row.sent_on || '',
            row.error || '',
            row.lead_status || '',
            row.notes || '',
            row.last_contact || '',
            row.website_clicked ? 'YES' : 'NO',
            row.click_time || '',
            row.ab_version || '',
            row.ab_click || '',
            row.last_email_date || '',
            row.followup_stage || 0,
            row.bounce_status ? 'YES' : 'NO',
            row.bounce_type || '',
            row.bounce_date || '',
            row.bounce_reason || '',
            row.retry_count || 0,
            row.bounce_processed ? 'YES' : 'NO',
            row.lead_score || 0,
            row.reply_status || '',
            row.reply_date || '',
            row.reply_content || ''
        ];
        csv += values.join(',') + '\n';
    });
    
    return csv;
}

module.exports = {
    importContacts,
    getContacts,
    getContact,
    updateContact,
    deleteContact,
    getCampaignList,
    checkDuplicateEmails,
    exportContacts,
    autoMapHeader,
    isValidEmail,
    generateLeadID,
    getExistingEmails
};
