# 🇿🇲 Zambian School Management System v2.0.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PHP Version](https://img.shields.io/badge/PHP-8.1%2B-blue.svg)](https://php.net)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)

A revolutionary educational technology platform specifically designed for rural and resource-constrained schools in Zambia and other developing countries. Unlike traditional school management systems that require constant internet and power, our solution operates **completely offline for 7+ days**, uses **SMS/USSD for communication**, and integrates with **solar power systems**.

## **Perfect for RootLab Ignite 2025**

This project aligns with multiple RootLab focus areas:

- **AI for Social Good**: Smart analytics without external APIs
- **Green Tech**: Solar power optimization and sustainability
- **AgriTech**: Agricultural calendar integration
- **Innovation**: Offline-first PWA technology

## Key Features

### 🇿🇲 **Zambian Rural School Adaptations**

- **7-Day Offline Operation**: Complete functionality without internet connectivity
- **SMS/USSD Integration**: Communication via basic mobile phones
- **Solar Power Optimization**: Ultra-low power consumption for renewable energy
- **Multi-Language Support**: Native support for Bemba, Tonga, Nyanja, Lozi, Kaonde, Lunda, and Luvale
- **Agricultural Calendar Integration**: School schedules adapted to farming seasons
- **Mobile Money Integration**: Fee payments via Airtel Money/MTN Mobile Money
- **Multi-Grade Classroom Support**: Tools for combined grade classes

### **Enterprise Security**

- **AES-256-GCM Encryption**: Military-grade data protection
- **TLS 1.3 Protocol**: Latest transport layer security
- **Certificate Pinning**: Enhanced protection against MITM attacks
- **Intrusion Detection**: Real-time security monitoring
- **Session Fingerprinting**: Advanced authentication security
- **Rate Limiting**: API protection against abuse
- **Security Headers**: XSS, clickjacking, and CSRF protection

### **Progressive Web App (PWA) with Offline Support**

- **Offline Functionality**: Full app functionality without internet
- **Service Worker**: Smart caching and background sync
- **IndexedDB Storage**: Local database for offline data
- **Cache-First Strategy**: Instant loading from local cache
- **Background Sync**: Automatic data synchronization when online
- **App-like Experience**: Native app feel on all devices

### **Smart Analytics Engine**

- **Rule-based Analytics**: Advanced data analysis without external AI APIs
- **Statistical Analysis**: Comprehensive performance metrics and insights
- **Real-time Dashboards**: Live data visualization with Chart.js
- **Predictive Analytics**: Trend analysis and forecasting
- **Custom Reports**: Automated report generation with PDF export
- **Performance Monitoring**: System and user performance tracking

### **Gamification System**

- **Achievement Badges**: Subject-specific rewards and recognition
- **Progress Tracking**: Visual progress indicators and milestones
- **Leaderboards**: Competitive elements to motivate students
- **Challenge System**: Educational games and quizzes
- **Reward Points**: Point-based incentive system
- **Subject Integration**: Curriculum-aligned gaming elements

### **Multi-Role Dashboard System**

- **Students**: Dashboard, grades, attendance, gamification, offline access
- **Teachers**: Class management, grading, analytics, game creation
- **HODs**: Department oversight, performance analysis, reporting
- **Admins**: System administration, security monitoring, user management

### **Azure Cloud Integration**

- **Azure for Students**: Free hosting with .azurewebsites.net subdomain
- **Azure Storage**: Secure file and data storage
- **Azure CDN**: Global content delivery network
- **Application Insights**: Performance and error monitoring
- **Auto-scaling**: Automatic resource scaling based on demand

## Technology Stack

### Frontend

- **Next.js 14**: React framework with App Router
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Data visualization library
- **Zustand**: State management
- **React Hook Form**: Form handling
- **Lucide React**: Icon library
- **CryptoJS**: Client-side encryption
- **Workbox**: PWA service worker management

### Backend

- **Laravel 10**: PHP framework with enterprise features
- **MySQL**: Database management with encryption
- **Laravel Sanctum**: API authentication
- **Spatie Permissions**: Role and permission management
- **Redis**: Caching and session storage
- **Laravel Horizon**: Queue monitoring

### Security & Performance

- **AES-256-GCM**: Authenticated encryption
- **TLS 1.3**: Latest transport security
- **PBKDF2**: Password hashing
- **HMAC-SHA256**: Message authentication
- **Rate Limiting**: API protection
- **Security Headers**: Comprehensive protection

## Deployment

### Vercel + Neon (Recommended)

This project deploys to **Vercel** with **Neon** PostgreSQL.

See: [Vercel deployment guide](VERCEL_DEPLOY.md)
