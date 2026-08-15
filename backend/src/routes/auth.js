// =====================================================
// Auth Routes
// =====================================================

const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Debug logging
console.log('Auth routes loaded');
console.log('Supabase client available:', !!supabase);

// =====================================================
// Sign Up
// =====================================================

router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name: name || email.split('@')[0] }
            }
        });
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        // Create default settings for new user
        if (data.user) {
            const defaultSettings = [
                { key: 'DAILY_LIMIT', value: '20' },
                { key: 'WAIT_TIME', value: '3000' },
                { key: 'SENDER_NAME', value: 'GS Mailer' },
                { key: 'JOB_TITLE', value: 'Email Marketing Specialist' }
            ];
            
            for (const setting of defaultSettings) {
                await supabase
                    .from('settings')
                    .insert({
                        user_id: data.user.id,
                        key: setting.key,
                        value: setting.value
                    });
            }
        }
        
        res.json({
            success: true,
            user: data.user,
            session: data.session,
            token: data.session ? data.session.access_token : null
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =====================================================
// Sign In
// =====================================================

router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        res.json({
            success: true,
            user: data.user,
            session: data.session,
            token: data.session ? data.session.access_token : null
        });
    } catch (err) {
        console.error('Signin error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =====================================================
// Login (alias for signin - matches frontend)
// =====================================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        res.json({
            success: true,
            user: data.user,
            session: data.session,
            token: data.session ? data.session.access_token : null
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =====================================================
// Sign Out
// =====================================================

router.post('/signout', authenticate, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Signout error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =====================================================
// Get Current User
// =====================================================

router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            user: req.user
        });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
