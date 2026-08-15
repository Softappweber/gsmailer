const express = require('express');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Get all templates
router.get('/', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Get templates error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get single template
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('user_id', req.userId)
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Template not found' });
        res.json(data);
    } catch (err) {
        console.error('Get template error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create template
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, subject, html_content, is_followup } = req.body;
        
        const { data, error } = await supabase
            .from('templates')
            .insert({
                user_id: req.userId,
                name,
                subject: subject || '',
                html_content,
                is_followup: is_followup || false
            })
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Create template error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update template
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { name, subject, html_content, is_followup } = req.body;
        
        const { data, error } = await supabase
            .from('templates')
            .update({
                name,
                subject,
                html_content,
                is_followup,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', req.userId)
            .eq('id', req.params.id)
            .select()
            .single();
        
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Template not found' });
        res.json(data);
    } catch (err) {
        console.error('Update template error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete template
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { error } = await supabase
            .from('templates')
            .delete()
            .eq('user_id', req.userId)
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Delete template error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
