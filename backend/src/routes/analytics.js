const express = require('express');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        // Get total contacts
        const { count: totalContacts, error: contactError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.userId);

        if (contactError) throw contactError;

        // Get sent count
        const { count: sentCount, error: sentError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.userId)
            .eq('status', 'Sent');

        if (sentError) throw sentError;

        // Get click count
        const { count: clickCount, error: clickError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.userId)
            .eq('website_clicked', true);

        if (clickError) throw clickError;

        // Get bounce count
        const { count: bounceCount, error: bounceError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.userId)
            .eq('bounce_status', true);

        if (bounceError) throw bounceError;

        // Get reply count
        const { count: replyCount, error: replyError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.userId)
            .not('reply_status', 'is', null);

        if (replyError) throw replyError;

        res.json({
            total_contacts: totalContacts || 0,
            sent: sentCount || 0,
            clicks: clickCount || 0,
            bounces: bounceCount || 0,
            replies: replyCount || 0,
            click_rate: sentCount > 0 ? Math.round((clickCount / sentCount) * 100) : 0,
            bounce_rate: sentCount > 0 ? Math.round((bounceCount / sentCount) * 100) : 0
        });
    } catch (err) {
        console.error('Dashboard analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get campaign analytics
router.get('/campaign/:campaignId', authenticate, async (req, res) => {
    try {
        const { campaignId } = req.params;

        // Get campaign details
        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('name')
            .eq('user_id', req.userId)
            .eq('id', campaignId)
            .single();

        if (campaignError) throw campaignError;
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const campaignName = campaign.name;

        // Get contacts for this campaign
        const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', req.userId)
            .eq('campaign', campaignName);

        if (contactsError) throw contactsError;

        const total = contacts.length;
        const sent = contacts.filter(c => c.status === 'Sent').length;
        const clicks = contacts.filter(c => c.website_clicked).length;
        const bounces = contacts.filter(c => c.bounce_status).length;
        const replies = contacts.filter(c => c.reply_status).length;

        res.json({
            campaign_name: campaignName,
            total,
            sent,
            clicks,
            bounces,
            replies,
            click_rate: sent > 0 ? Math.round((clicks / sent) * 100) : 0,
            bounce_rate: sent > 0 ? Math.round((bounces / sent) * 100) : 0,
            reply_rate: sent > 0 ? Math.round((replies / sent) * 100) : 0
        });
    } catch (err) {
        console.error('Campaign analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get A/B test results
router.get('/abtest/:campaignId', authenticate, async (req, res) => {
    try {
        const { campaignId } = req.params;

        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('name')
            .eq('user_id', req.userId)
            .eq('id', campaignId)
            .single();

        if (campaignError) throw campaignError;
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const campaignName = campaign.name;

        const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', req.userId)
            .eq('campaign', campaignName);

        if (contactsError) throw contactsError;

        const versionA = contacts.filter(c => c.ab_version === 'A');
        const versionB = contacts.filter(c => c.ab_version === 'B');

        const getStats = (contacts) => ({
            total: contacts.length,
            sent: contacts.filter(c => c.status === 'Sent').length,
            clicks: contacts.filter(c => c.website_clicked).length
        });

        const statsA = getStats(versionA);
        const statsB = getStats(versionB);

        res.json({
            version_a: {
                ...statsA,
                click_rate: statsA.sent > 0 ? Math.round((statsA.clicks / statsA.sent) * 100) : 0
            },
            version_b: {
                ...statsB,
                click_rate: statsB.sent > 0 ? Math.round((statsB.clicks / statsB.sent) * 100) : 0
            },
            winning_version: statsA.clicks > statsB.clicks ? 'A' : statsB.clicks > statsA.clicks ? 'B' : 'tie'
        });
    } catch (err) {
        console.error('A/B test analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
