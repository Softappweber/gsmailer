// =====================================================
// Tracking Routes
// =====================================================

const express = require('express');
const emailService = require('../services/emailService');

const router = express.Router();

// =====================================================
// Track Click (Public - No Auth)
// =====================================================

router.get('/', async (req, res) => {
    try {
        const { lead, campaign, ab } = req.query;
        
        if (!lead || !campaign) {
            return res.status(400).send('Missing tracking parameters');
        }
        
        // Get user_id from campaign
        const { supabase } = require('../config/supabase');
        const { data: campaignData } = await supabase
            .from('campaigns')
            .select('user_id, landing_page')
            .eq('name', campaign)
            .single();
        
        if (!campaignData) {
            return res.status(404).send('Campaign not found');
        }
        
        // Track the click
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';
        
        await emailService.trackClick(
            campaignData.user_id,
            lead,
            campaign,
            ab || 'A',
            ip,
            userAgent
        );
        
        // Redirect to landing page
        const landingPage = campaignData.landing_page || 'https://example.com';
        res.redirect(landingPage);
    } catch (err) {
        console.error('Tracking error:', err);
        res.status(500).send('Tracking failed');
    }
});

module.exports = router;
