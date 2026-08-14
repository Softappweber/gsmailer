// =====================================================
// GS MAILER v10 Web SaaS - Main Server
// =====================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();

// =====================================================
// Middleware
// =====================================================

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many requests, please try again later.'
});
app.use('/api/', apiLimiter);

// =====================================================
// Routes
// =====================================================

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/contacts', require('./src/routes/contacts'));
app.use('/api/campaigns', require('./src/routes/campaigns'));
app.use('/api/templates', require('./src/routes/templates'));
app.use('/api/attachments', require('./src/routes/attachments'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/tracking', require('./src/routes/tracking'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// Scheduled Jobs
// =====================================================

// Follow-ups - daily at 9 AM
cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running follow-up check...');
    try {
        const { sendFollowUps } = require('./src/jobs/followups');
        await sendFollowUps();
    } catch (err) {
        console.error('[CRON] Follow-up error:', err);
    }
});

// Bounce detection - every 6 hours
cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] Running bounce detection...');
    try {
        const { checkBounces } = require('./src/jobs/bounces');
        await checkBounces();
    } catch (err) {
        console.error('[CRON] Bounce error:', err);
    }
});

// Reply detection - every 4 hours
cron.schedule('0 */4 * * *', async () => {
    console.log('[CRON] Running reply detection...');
    try {
        const { checkReplies } = require('./src/jobs/replies');
        await checkReplies();
    } catch (err) {
        console.error('[CRON] Reply error:', err);
    }
});

// =====================================================
// Start Server
// =====================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ GS Mailer Backend running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
