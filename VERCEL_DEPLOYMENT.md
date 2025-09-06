# 🚀 Vercel + Supabase Deployment Guide

## 🇿🇲 Zambian School Management System

Complete deployment guide for hosting the School Management System using **Vercel** (frontend) and **Supabase** (backend database).

## 📋 Prerequisites

- GitHub account
- Vercel account (free tier available)
- Supabase account (free tier available)
- Node.js 18+ (for local development)

## 🗄️ Step 1: Setup Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project:
   - **Name**: `zambian-school-management`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users

### 1.2 Setup Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql`
3. Run the SQL to create all tables and relationships

### 1.3 Configure Authentication
1. Go to **Authentication** → **Settings**
2. Enable **Email** provider
3. Set **Site URL**: `https://your-app.vercel.app`
4. Add **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 1.4 Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**
   - **anon public key**
   - **service_role key** (keep secret!)

## 🌐 Step 2: Deploy to Vercel

### 2.1 Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository: `bernardzulu23/school_management_systems`

### 2.2 Configure Environment Variables
In Vercel dashboard, go to **Settings** → **Environment Variables** and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_NAME=Zambian School Management System
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_PWA_ENABLED=true
NEXT_PUBLIC_OFFLINE_MODE=true

# Security
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=https://your-app.vercel.app
```

### 2.3 Deploy
1. Click **Deploy**
2. Wait for build to complete
3. Your app will be available at `https://your-app.vercel.app`

## 🔧 Step 3: Configure Custom Domain (Optional)

### 3.1 Add Domain
1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `school.zambiantech.com`)
3. Configure DNS records as instructed

### 3.2 Update Supabase Settings
1. Update **Site URL** in Supabase to your custom domain
2. Add custom domain to **Redirect URLs**

## 👥 Step 4: Setup Initial Users

### 4.1 Create Admin User
1. Go to Supabase **Authentication** → **Users**
2. Click "Add user"
3. Create admin user:
   - **Email**: `admin@yourschool.zm`
   - **Password**: Strong password
   - **Role**: Will be set via SQL

### 4.2 Set User Role
In Supabase SQL Editor, run:
```sql
-- Insert admin profile
INSERT INTO profiles (id, name, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@yourschool.zm'),
  'System Administrator',
  'admin@yourschool.zm',
  'admin'
);
```

## 📊 Step 5: Populate Sample Data (Optional)

Run these SQL commands in Supabase to add sample data:

```sql
-- Insert sample subjects
INSERT INTO subjects (name, code, description) VALUES
('Mathematics', 'MATH', 'Core mathematics curriculum'),
('English', 'ENG', 'English language and literature'),
('Science', 'SCI', 'General science subjects'),
('Social Studies', 'SS', 'History, geography, and civics');

-- Insert sample class
INSERT INTO school_classes (name, grade_level) VALUES
('Grade 7A', 7),
('Grade 8A', 8),
('Grade 9A', 9);
```

## 🔍 Step 6: Testing

### 6.1 Test Authentication
1. Visit your deployed app
2. Try logging in with admin credentials
3. Verify dashboard loads correctly

### 6.2 Test PWA Features
1. Open app in mobile browser
2. Add to home screen
3. Test offline functionality

### 6.3 Test API Endpoints
Visit these URLs to test API:
- `https://your-app.vercel.app/api/dashboard/stats`
- `https://your-app.vercel.app/api/students`

## 🚀 Step 7: Production Optimizations

### 7.1 Enable Vercel Analytics
1. Go to **Analytics** tab in Vercel
2. Enable **Web Analytics**
3. Monitor performance metrics

### 7.2 Setup Monitoring
1. Enable **Vercel Speed Insights**
2. Configure **Supabase Monitoring**
3. Set up alerts for downtime

### 7.3 Backup Strategy
1. Enable **Supabase Backups**
2. Schedule regular database exports
3. Store backups in secure location

## 🔐 Security Checklist

- ✅ Environment variables are secure
- ✅ Supabase RLS policies are enabled
- ✅ HTTPS is enforced
- ✅ CORS is properly configured
- ✅ Authentication is working
- ✅ API endpoints are protected

## 📈 Scaling Considerations

### Database Scaling
- Monitor Supabase usage in dashboard
- Upgrade plan when approaching limits
- Optimize queries for performance

### Frontend Scaling
- Vercel automatically scales
- Monitor Core Web Vitals
- Optimize images and assets

## 🆘 Troubleshooting

### Common Issues

**Build Fails**
- Check environment variables are set
- Verify Node.js version compatibility
- Check for syntax errors in code

**Database Connection Issues**
- Verify Supabase URL and keys
- Check network connectivity
- Ensure RLS policies allow access

**Authentication Problems**
- Verify redirect URLs in Supabase
- Check NEXTAUTH_URL is correct
- Ensure user exists in profiles table

## 📞 Support

For deployment issues:
1. Check Vercel deployment logs
2. Monitor Supabase logs
3. Review browser console errors
4. Check network requests in DevTools

---

**🎉 Congratulations! Your Zambian School Management System is now live on Vercel + Supabase!**
