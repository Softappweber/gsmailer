// =====================================================
// GS Mailer Backend Server
// =====================================================

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// =====================================================
// CORS Configuration
// =====================================================

const corsOptions = {
    origin: '*',  // Allow all origins for debugging
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// =====================================================
// Middleware
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================================================
// Routes
// =====================================================

// Import routes
const authRoutes = require('./src/routes/auth');
const contactsRoutes = require('./src/routes/contacts');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);

// =====================================================
// Health Check
// =====================================================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// Debug Endpoint
// =====================================================

app.get('/debug', (req, res) => {
    res.json({
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        frontendUrl: process.env.FRONTEND_URL,
        supabaseUrlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : null,
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
    });
});

// =====================================================
// Root Route
// =====================================================

app.get('/', (req, res) => {
    res.json({
        message: 'GS Mailer API',
        endpoints: [
            '/health',
            '/debug',
            '/api/auth/signup',
            '/api/auth/signin',
            '/api/auth/login',
            '/api/auth/signout',
            '/api/auth/me',
            '/api/contacts'
        ]
    });
});

// =====================================================
// Error Handler
// =====================================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// =====================================================
// Start Server
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ GS Mailer server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 Debug: http://localhost:${PORT}/debug`);
});
