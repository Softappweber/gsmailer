// =====================================================
// Campaign Service - Ported from CampaignManager.js
// =====================================================

const { supabase } = require('../config/supabase');

// =====================================================
// Get Campaign Configuration
// =====================================================

async function getCampaignConfig(userId, campaignName) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .eq('name', campaignName)
        .single();
    
    if (error) {
        return null;
    }
    
    return data;
}

// =====================================================
// Get All Campaigns
// =====================================================

async function getCampaigns(userId) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new Error('Failed to fetch campaigns');
    }
    
    return data || [];
}

// =====================================================
// Create Campaign
// =====================================================

async function createCampaign(userId, campaignData) {
    const { data, error } = await supabase
        .from('campaigns')
        .insert({
            user_id: userId,
            name: campaignData.name,
            subject_a: campaignData.subjectA,
            subject_b: campaignData.subjectB || null,
            template_a: campaignData.templateA,
            template_b: campaignData.templateB || null,
            followup1: campaignData.followup1 || null,
            followup2: campaignData.followup2 || null,
            followup3: campaignData.followup3 || null,
            landing_page: campaignData.landingPage,
            enabled: campaignData.enabled !== undefined ? campaignData.enabled : true,
            sender_name: campaignData.senderName,
            job_title: campaignData.jobTitle,
            daily_limit: campaignData.dailyLimit || 20,
            wait_time: campaignData.waitTime || 3000
        })
        .select()
        .single();
    
    if (error) {
        throw new Error('Failed to create campaign');
    }
    
    return data;
}

// =====================================================
// Update Campaign
// =====================================================

async function updateCampaign(userId, campaignId, updates) {
    const { data, error } = await supabase
        .from('campaigns')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('id', campaignId)
        .select()
        .single();
    
    if (error) {
        throw new Error('Failed to update campaign');
    }
    
    return data;
}

// =====================================================
// Delete Campaign
// =====================================================

async function deleteCampaign(userId, campaignId) {
    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('user_id', userId)
        .eq('id', campaignId);
    
    if (error) {
        throw new Error('Failed to delete campaign');
    }
    
    return true;
}

// =====================================================
// Get Campaign Stats
// =====================================================

async function getCampaignStats(userId, campaignId) {
    // Get total contacts in campaign
    const { count: totalContacts, error: contactError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('campaign', campaignId);
    
    if (contactError) {
        throw new Error('Failed to get campaign stats');
    }
    
    // Get sent count
    const { count: sentCount, error: sentError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('campaign', campaignId)
        .eq('status', 'Sent');
    
    if (sentError) {
        throw new Error('Failed to get sent stats');
    }
    
    // Get click count
    const { count: clickCount, error: clickError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('campaign', campaignId)
        .eq('website_clicked', true);
    
    if (clickError) {
        throw new Error('Failed to get click stats');
    }
    
    // Get bounce count
    const { count: bounceCount, error: bounceError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('campaign', campaignId)
        .eq('bounce_status', true);
    
    if (bounceError) {
        throw new Error('Failed to get bounce stats');
    }
    
    // Get reply count
    const { count: replyCount, error: replyError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('campaign', campaignId)
        .not('reply_status', 'is', null);
    
    if (replyError) {
        throw new Error('Failed to get reply stats');
    }
    
    return {
        total_contacts: totalContacts || 0,
        sent: sentCount || 0,
        clicks: clickCount || 0,
        bounces: bounceCount || 0,
        replies: replyCount || 0,
        click_rate: sentCount > 0 ? Math.round((clickCount / sentCount) * 100) : 0,
        bounce_rate: sentCount > 0 ? Math.round((bounceCount / sentCount) * 100) : 0
    };
}

module.exports = {
    getCampaignConfig,
    getCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignStats
};
