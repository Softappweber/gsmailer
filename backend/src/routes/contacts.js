// =====================================================
// Contacts Routes
// =====================================================

const express = require('express');
const { authenticate } = require('../middleware/auth');
const contactService = require('../services/contactService');

const router = express.Router();

// =====================================================
// Get Contacts (paginated)
// =====================================================

router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const filters = {
            campaign: req.query.campaign,
            status: req.query.status,
            lead_status: req.query.lead_status,
            bounce_status: req.query.bounce_status === 'true' ? true : 
                           req.query.bounce_status === 'false' ? false : undefined,
            search: req.query.search
        };
        
        const result = await contactService.getContacts(
            req.userId,
            page,
            limit,
            filters
        );
        
        res.json(result);
    } catch (err) {
        console.error('Get contacts error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Get Single Contact
// =====================================================

router.get('/:id', authenticate, async (req, res) => {
    try {
        const contact = await contactService.getContact(req.userId, req.params.id);
        res.json(contact);
    } catch (err) {
        console.error('Get contact error:', err);
        res.status(404).json({ error: err.message });
    }
});

// =====================================================
// Update Contact
// =====================================================

router.put('/:id', authenticate, async (req, res) => {
    try {
        const contact = await contactService.updateContact(
            req.userId,
            req.params.id,
            req.body
        );
        res.json(contact);
    } catch (err) {
        console.error('Update contact error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Delete Contact
// =====================================================

router.delete('/:id', authenticate, async (req, res) => {
    try {
        await contactService.deleteContact(req.userId, req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete contact error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Import Contacts (CSV)
// =====================================================

router.post('/import', authenticate, async (req, res) => {
    try {
        const { csvText, mapping, campaign } = req.body;
        
        if (!csvText) {
            return res.status(400).json({ error: 'CSV text required' });
        }
        
        const result = await contactService.importContacts(
            req.userId,
            csvText,
            mapping,
            campaign
        );
        
        res.json(result);
    } catch (err) {
        console.error('Import contacts error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Check Duplicate Emails
// =====================================================

router.get('/duplicates/check', authenticate, async (req, res) => {
    try {
        const result = await contactService.checkDuplicateEmails(req.userId);
        res.json(result);
    } catch (err) {
        console.error('Duplicate check error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Export Contacts
// =====================================================

router.get('/export', authenticate, async (req, res) => {
    try {
        const csv = await contactService.exportContacts(req.userId);
        
        if (!csv) {
            return res.status(404).json({ error: 'No contacts to export' });
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
        res.send(csv);
    } catch (err) {
        console.error('Export contacts error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Get Campaign List
// =====================================================

router.get('/campaigns/list', authenticate, async (req, res) => {
    try {
        const campaigns = await contactService.getCampaignList(req.userId);
        res.json(campaigns);
    } catch (err) {
        console.error('Get campaigns error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// Auto-map CSV Header
// =====================================================

router.post('/csv/map', authenticate, async (req, res) => {
    try {
        const { header } = req.body;
        
        if (!header || !Array.isArray(header)) {
            return res.status(400).json({ error: 'Header array required' });
        }
        
        const mapping = contactService.autoMapHeader(header);
        res.json({ header, mapping });
    } catch (err) {
        console.error('CSV map error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
