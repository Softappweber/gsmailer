const express = require('express');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Get all settings
router.get('/', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', req.userId);

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update settings
router.put('/', authenticate, async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({ error: 'Settings array required' });
        }

        const results = [];

        for (const setting of settings) {
            const { key, value } = setting;

            // Check if setting exists
            const { data: existing, error: findError } = await supabase
                .from('settings')
                .select('id')
                .eq('user_id', req.userId)
                .eq('key', key)
                .single();

            if (findError && findError.code !== 'PGRST116') {
                throw findError;
            }

            let result;
            if (existing) {
                // Update
                const { data, error } = await supabase
                    .from('settings')
                    .update({ value, updated_at: new Date().toISOString() })
                    .eq('user_id', req.userId)
                    .eq('key', key)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('settings')
                    .insert({ user_id: req.userId, key, value })
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            results.push(result);
        }

        res.json(results);
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get single setting by key
router.get('/:key', authenticate, async (req, res) => {
    try {
        const { key } = req.params;

        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('user_id', req.userId)
            .eq('key', key)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({ key, value: null });
            }
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('Get setting error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
