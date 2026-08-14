// =====================================================
// Campaigns Routes
// =====================================================

const express = require('express');
const { authenticate } = require('../middleware/auth');
const campaignService = require('../services/campaignService');
const emailService = require('../services/emailService');
const contactService = require('../services/contactService');
const { supabase } = require('../config/supabase');

const router = express.Router();

// =====================================================
// Get All Campaigns
// =====================================================

router.get('/', authenticate, async (req, res) => {
    try {
        const campaigns = await campaignService.getCampaigns(req.userId);
        res.json(campaigns);
    } catch (err) {
        console.error('Get campaigns error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Get Single Campaign
// =====================================================

router.get('/:id', authenticate, async (req, res) => {
    try {
        const campaigns = await campaignService.getCampaigns(req.userId);
        const campaign = campaigns.find(c => c.id === req.params.id);
        
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        // Get stats
        const stats = await campaignService.getCampaignStats(req.userId, req.params.id);
        
        res.json({ ...campaign, stats });
    } catch (err) {
        console.error('Get campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Create Campaign
// =====================================================

router.post('/', authenticate, async (req, res) => {
    try {
        const campaign = await campaignService.createCampaign(req.userId, req.body);
        res.json(campaign);
    } catch (err) {
        console.error('Create campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Update Campaign
// =====================================================

router.put('/:id', authenticate, async (req, res) => {
    try {
        const campaign = await campaignService.updateCampaign(
            req.userId,
            req.params.id,
            req.body
        );
        res.json(campaign);
    } catch (err) {
        console.error('Update campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Delete Campaign
// =====================================================

router.delete('/:id', authenticate, async (req, res) => {
    try {
        await campaignService.deleteCampaign(req.userId, req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Send Campaign
// =====================================================

router.post('/:id/send', authenticate, async (req, res) => {
    try {
        const { testMode = false, testEmail } = req.body;
        
        // Get campaign
        const campaigns = await campaignService.getCampaigns(req.userId);
        const campaign = campaigns.find(c => c.id === req.params.id);
        
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        // Get settings
        const { data: settings } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', req.userId);
        
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });
        
        const dailyLimit = parseInt(settingsMap['DAILY_LIMIT'] || 20);
        const waitTime = parseInt(settingsMap['WAIT_TIME'] || 3000);
        const senderName = settingsMap['SENDER_NAME'] || campaign.sender_name || 'GS Mailer';
        const jobTitle = settingsMap['JOB_TITLE'] || campaign.job_title || '';
        
        // Get contacts
        const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', req.userId)
            .eq('campaign', campaign.name)
            .eq('status', 'New')
            .not('bounce_status', 'eq', true)
            .limit(dailyLimit);
        
        if (!contacts || contacts.length === 0) {
            return res.json({
                success: true,
                message: 'No contacts to send to',
                sent: 0
            });
        }
        
        let sent = 0;
        const errors = [];
        
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            
            // Check if we've hit the daily limit
            if (sent >= dailyLimit) break;
            
            // Get the template
            let templateName = campaign.template_a;
            let subject = campaign.subject_a;
            let abVersion = 'A';
            
            // A/B testing
            if (campaign.subject_b && campaign.template_b && sent % 2 === 1) {
                subject = campaign.subject_b;
                templateName = campaign.template_b;
                abVersion = 'B';
            }
            
            // Get template HTML
            const { data: templateData } = await supabase
                .from('templates')
                .select('html_content')
                .eq('user_id', req.userId)
                .eq('name', templateName)
                .single();
            
            if (!templateData) {
                errors.push(`Template ${templateName} not found for ${contact.email}`);
                continue;
            }
            
            // Personalize template
            let html = templateData.html_content;
            html = html.replace(/\{\{firstName\}\}/g, contact.first_name || 'there');
            html = html.replace(/\{\{company\}\}/g, contact.company || '');
            html = html.replace(/\{\{sender\}\}/g, senderName);
            html = html.replace(/\{\{title\}\}/g, jobTitle);
            html = html.replace(/\{\{website\}\}/g, `${process.env.FRONTEND_URL}/track?lead=${contact.lead_id}&campaign=${campaign.name}&ab=${abVersion}`);
            
            // Get attachments
            const { data: campaignAttachments } = await supabase
                .from('campaign_attachments')
                .select('attachment_id')
                .eq('campaign_id', campaign.id);
            
            const attachments = [];
            if (campaignAttachments && campaignAttachments.length > 0) {
                for (const ca of campaignAttachments) {
                    const { data: attData } = await supabase
                        .from('attachments')
                        .select('file_url, file_name, file_type')
                        .eq('user_id', req.userId)
                        .eq('id', ca.attachment_id)
                        .single();
                    
                    if (attData) {
                        attachments.push({
                            filename: attData.file_name,
                            path: attData.file_url, // This would need to be fetched from storage
                            contentType: attData.file_type
                        });
                    }
                }
            }
            
            try {
                // Send email
                await emailService.sendCampaignEmail({
                    userId: req.userId,
                    contactId: contact.id,
                    email: contact.email,
                    subject,
                    html,
                    attachments,
                    senderName,
                    campaignName: campaign.name,
                    abVersion,
                    isFollowup: false
                });
                
                // Update contact
                await supabase
                    .from('contacts')
                    .update({
                        status: 'Sent',
                        sent_on: new Date().toISOString(),
                        last_email_date: new Date().toISOString(),
                        last_contact: new Date().toISOString(),
                        ab_version: abVersion,
                        followup_stage: 0
                    })
                    .eq('user_id', req.userId)
                    .eq('id', contact.id);
                
                sent++;
                
                // Wait between sends
                if (i < contacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            } catch (err) {
                errors.push(`${contact.email}: ${err.message}`);
                
                // Mark as failed
                await supabase
                    .from('contacts')
                    .update({
                        status: 'Failed',
                        error: err.message
                    })
                    .eq('user_id', req.userId)
                    .eq('id', contact.id);
            }
        }
        
        res.json({
            success: true,
            sent,
            errors,
            total: contacts.length
        });
    } catch (err) {
        console.error('Send campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Get Campaign Stats
// =====================================================

router.get('/:id/stats', authenticate, async (req, res) => {
    try {
        const stats = await campaignService.getCampaignStats(req.userId, req.params.id);
        res.json(stats);
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
