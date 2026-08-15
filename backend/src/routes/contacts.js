// =====================================================
// Contacts Routes
// =====================================================

const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all contacts for the authenticated user
router.get('/', authenticate, async (req, res) => {
    try {
        // For now, return empty array or fetch from database
        // You can implement the actual database query later
        
        // Example with Supabase:
        // const { data, error } = await supabase
        //     .from('contacts')
        //     .select('*')
        //     .eq('user_id', req.userId);
        
        // For now, just return empty array
        res.json([]);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

// Create a new contact
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email required' });
        }
        
        // For now, just return success
        res.json({ success: true, message: 'Contact created (placeholder)' });
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

module.exports = router;
