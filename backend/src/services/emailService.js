// =====================================================
// Email Service - Ported from Main.js
// =====================================================

const nodemailer = require('nodemailer');
const { supabase } = require('../config/supabase');

// =====================================================
// Create Transporter
// =====================================================

let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });
    }
    return transporter;
}

// =====================================================
// Send Email
// =====================================================

async function sendEmail({
    to,
    subject,
    html,
    text,
    from,
    attachments = [],
    senderName = null
}) {
    const transporter = getTransporter();
    
    const fromName = senderName || process.env.EMAIL_FROM;
    const fromEmail = process.env.EMAIL_USER;
    
    // Format attachments for Nodemailer
    const nodemailerAttachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
    }));
    
    const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
        text: text || 'Your email client does not support HTML.',
        attachments: nodemailerAttachments
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Email send error:', err);
        throw new Error(`Failed to send email: ${err.message}`);
    }
}

// =====================================================
// Send Campaign Email (wrapped with logging)
// =====================================================

async function sendCampaignEmail({
    userId,
    contactId,
    email,
    subject,
    html,
    attachments = [],
    senderName,
    campaignName,
    abVersion,
    isFollowup = false,
    followupStage = 0
}) {
    try {
        // Send the email
        const result = await sendEmail({
            to: email,
            subject,
            html,
            senderName,
            attachments
        });
        
        // Log the event
        await supabase
            .from('email_events')
            .insert({
                user_id: userId,
                contact_id: contactId,
                event_type: 'sent',
                email,
                subject,
                ab_version: abVersion,
                is_followup: isFollowup,
                followup_stage: isFollowup ? followupStage : null,
                metadata: {
                    campaign: campaignName,
                    message_id: result.messageId
                }
            });
        
        return result;
    } catch (err) {
        // Log failure
        await supabase
            .from('email_events')
            .insert({
                user_id: userId,
                contact_id: contactId,
                event_type: 'failed',
                email,
                subject,
                ab_version: abVersion,
                is_followup: isFollowup,
                metadata: {
                    campaign: campaignName,
                    error: err.message
                }
            });
        
        throw err;
    }
}

// =====================================================
// Track Click
// =====================================================

async function trackClick(userId, leadId, campaignName, abVersion, ip, userAgent) {
    // Find contact
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('lead_id', leadId)
        .single();
    
    if (contactError) {
        console.error('Contact not found for click:', leadId);
        return;
    }
    
    // Update contact
    await supabase
        .from('contacts')
        .update({
            website_clicked: true,
            click_time: new Date().toISOString(),
            ab_click: abVersion
        })
        .eq('user_id', userId)
        .eq('lead_id', leadId);
    
    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId)
        .eq('name', campaignName)
        .single();
    
    // Log tracking event
    await supabase
        .from('tracking_events')
        .insert({
            user_id: userId,
            contact_id: contact?.id || null,
            campaign_id: campaign?.id || null,
            lead_id: leadId,
            campaign_name: campaignName,
            ab_version: abVersion,
            ip_address: ip,
            user_agent: userAgent
        });
    
    // Update email events
    await supabase
        .from('email_events')
        .insert({
            user_id: userId,
            contact_id: contact?.id || null,
            campaign_id: campaign?.id || null,
            event_type: 'clicked',
            email: contact?.email || '',
            subject: '',
            ab_version: abVersion,
            metadata: {
                ip_address: ip,
                user_agent: userAgent
            }
        });
}

module.exports = {
    sendEmail,
    sendCampaignEmail,
    trackClick,
    getTransporter
};
