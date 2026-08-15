const express = require('express');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Get all attachments
router.get('/', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('attachments')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Get attachments error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get single attachment
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('attachments')
            .select('*')
            .eq('user_id', req.userId)
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Attachment not found' });
        res.json(data);
    } catch (err) {
        console.error('Get attachment error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create attachment
router.post('/', authenticate, async (req, res) => {
    try {
        const { file_name, file_url, file_type, file_size, description } = req.body;
        
        const { data, error } = await supabase
            .from('attachments')
            .insert({
                user_id: req.userId,
                file_name,
                file_url,
                file_type: file_type || '',
                file_size: file_size || 0,
                description: description || ''
            })
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Create attachment error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete attachment
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { error } = await supabase
            .from('attachments')
            .delete()
            .eq('user_id', req.userId)
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Delete attachment error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
