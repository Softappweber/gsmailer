// =====================================================
// Follow-up Job - Ported from FollowUp.js
// =====================================================

const { supabase } = require('../config/supabase');
const emailService = require('../services/emailService');

async function sendFollowUps() {
    console.log('[FollowUps] Starting follow-up check...');
    
    // Get all users
    const { data: users } = await supabase.auth.admin.listUsers();
    
    for (const user of users) {
        await processUserFollowups(user.id);
    }
}

async function processUserFollowups(userId) {
    try {
        // Get settings
        const { data: settings } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', userId);
        
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });
        
        const followupDays = [
            parseInt(settingsMap['FOLLOWUP_DAYS_1'] || 3),
            parseInt(settingsMap['FOLLOWUP_DAYS_2'] || 7),
            parseInt(settingsMap['FOLLOWUP_DAYS_3'] || 14)
        ];
        
        const senderName = settingsMap['SENDER_NAME'] || 'GS Mailer';
        const jobTitle = settingsMap['JOB_TITLE'] || '';
        
        // Get contacts that need follow-ups
        const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'Sent')
            .eq('website_clicked', false)
            .eq('bounce_status', false)
            .lt('followup_stage', 3)
            .not('last_email_date', 'is', null);
        
        if (!contacts || contacts.length === 0) return;
        
        for (const contact of contacts) {
            const lastEmailDate = new Date(contact.last_email_date);
            const now = new Date();
            const daysPassed = Math.floor((now - lastEmailDate) / (1000 * 60 * 60 * 24));
            
            const stage = contact.followup_stage;
            
            // Check if it's time for the next follow-up
            let shouldSend = false;
            let nextStage = stage;
            
            if (stage === 0 && daysPassed >= followupDays[0]) {
                shouldSend = true;
                nextStage = 1;
            } else if (stage === 1 && daysPassed >= followupDays[1]) {
                shouldSend = true;
                nextStage = 2;
            } else if (stage === 2 && daysPassed >= followupDays[2]) {
                shouldSend = true;
                nextStage = 3;
            }
            
            if (!shouldSend) continue;
            
            // Get campaign
            const { data: campaign } = await supabase
                .from('campaigns')
                .select('*')
                .eq('user_id', userId)
                .eq('name', contact.campaign)
                .single();
            
            if (!campaign) continue;
            
            // Get follow-up template
            let templateName = null;
            let subject = null;
            
            if (stage === 0 && campaign.followup1) {
                templateName = campaign.followup1;
                subject = campaign.subject_a;
            } else if (stage === 1 && campaign.followup2) {
                templateName = campaign.followup2;
                subject = campaign.subject_a;
            } else if (stage === 2 && campaign.followup3) {
                templateName = campaign.followup3;
                subject = campaign.subject_a;
            }
            
            if (!templateName) continue;
            
            // Get template
            const { data: templateData } = await supabase
                .from('templates')
                .select('html_content')
                .eq('user_id', userId)
                .eq('name', templateName)
                .single();
            
            if (!templateData) continue;
            
            // Personalize template
            let html = templateData.html_content;
            html = html.replace(/\{\{firstName\}\}/g, contact.first_name || 'there');
            html = html.replace(/\{\{company\}\}/g, contact.company || '');
            html = html.replace(/\{\{sender\}\}/g, senderName);
            html = html.replace(/\{\{title\}\}/g, jobTitle);
            html = html.replace(/\{\{website\}\}/g, `${process.env.FRONTEND_URL}/track?lead=${contact.lead_id}&campaign=${campaign.name}&ab=FU`);
            
            try {
                // Send follow-up
                await emailService.sendCampaignEmail({
                    userId,
                    contactId: contact.id,
                    email: contact.email,
                    subject: subject || `Follow-up ${stage + 1}`,
                    html,
                    attachments: [],
                    senderName,
                    campaignName: campaign.name,
                    abVersion: 'FU',
                    isFollowup: true,
                    followupStage: nextStage
                });
                
                // Update contact
                await supabase
                    .from('contacts')
                    .update({
                        followup_stage: nextStage,
                        last_email_date: new Date().toISOString(),
                        last_contact: new Date().toISOString()
                    })
                    .eq('user_id', userId)
                    .eq('id', contact.id);
                
                // Log follow-up
                await supabase
                    .from('followup_logs')
                    .insert({
                        user_id: userId,
                        contact_id: contact.id,
                        campaign_id: campaign.id,
                        lead_id: contact.lead_id,
                        email: contact.email,
                        campaign_name: campaign.name,
                        followup_stage: nextStage,
                        result: 'Sent'
                    });
                
                console.log(`[FollowUps] Sent follow-up ${nextStage} to ${contact.email}`);
            } catch (err) {
                console.error(`[FollowUps] Failed for ${contact.email}:`, err.message);
            }
        }
    } catch (err) {
        console.error(`[FollowUps] Error for user ${userId}:`, err);
    }
}

module.exports = { sendFollowUps };
