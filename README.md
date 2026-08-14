# GS Mailer - Email Marketing Platform

A complete email marketing SaaS platform built with Node.js, Express, Supabase, and vanilla JavaScript.

## Features

- 📧 Campaign management with A/B testing
- 👥 Contact import (CSV) with auto-mapping
- 📝 HTML email templates with personalization
- 📎 Attachment support (files from Supabase Storage)
- 🔗 Click tracking with redirects
- 📊 Dashboard with KPIs and charts
- 📨 Follow-up automation (3 stages with configurable delays)
- 🔄 Bounce detection and handling
- 💬 Reply detection and classification (Interested, Not Interested, Unsubscribe)
- 📈 Lead scoring based on engagement
- 🔐 User authentication (Supabase Auth)
- 🗄️ Multi-tenant ready (Row Level Security)

## Technology Stack

### Backend
- Node.js + Express
- Supabase (PostgreSQL) - database and auth
- Nodemailer (Gmail SMTP)
- Node-cron for scheduled jobs

### Frontend
- Vanilla HTML/CSS/JS (SPA)
- GitHub Pages hosting
- Supabase JS SDK

### Deployment
- Backend: Render (free tier)
- Frontend: GitHub Pages
- Database: Supabase (free tier)

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Git
- A GitHub account
- A Supabase account (free)
- A Render account (free)
- A Gmail account (for sending emails)

### 1. Clone this repository
```bash
git clone https://github.com/your-username/gs-mailer-backend.git
cd gs-mailer-backend
