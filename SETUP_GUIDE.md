# 🇿🇲 Zambian School Management System - Setup Guide

## 🚀 Quick Start (Current Setup)

### ✅ What's Working Now:
- **Backend API**: Running on http://localhost:8000
- **Database**: SQLite with sample data
- **Simple Frontend**: HTML interface available

### 🎯 Immediate Access:

1. **Start Backend** (if not running):
   ```bash
   start-backend.bat
   ```

2. **Open Simple Frontend**:
   ```bash
   start-simple-frontend.bat
   ```
   Or directly open: `simple-frontend.html`

3. **Test Login Credentials**:
   - **Headteacher**: headteacher@zambianschool.zm / headteacher123
   - **HOD**: hod@zambianschool.zm / hod123
   - **Teacher**: teacher@zambianschool.zm / teacher123
   - **Student**: student@zambianschool.zm / student123

## 🔧 Full Setup (For Complete Experience)

### Prerequisites:
- ✅ PHP 8.1+ (Already installed)
- ❌ Node.js 18+ (Not installed)
- ❌ npm 9+ (Comes with Node.js)

### Install Node.js for Full Frontend:

1. **Download Node.js**:
   - Visit: https://nodejs.org/
   - Download LTS version (recommended)
   - Install with default settings

2. **Verify Installation**:
   ```bash
   node --version
   npm --version
   ```

3. **Start Full Frontend**:
   ```bash
   cd school-management-frontend
   npm install
   npm run dev
   ```

4. **Access Full System**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

## 🌟 System Features

### 🇿🇲 Zambian-Specific Features:
- **Offline Operation**: 7+ days without internet
- **Multi-Language**: Bemba, Tonga, Nyanja, Lozi, Kaonde, Lunda, Luvale
- **Solar Power Optimized**: Low power consumption
- **SMS/USSD Integration**: Basic phone communication
- **Agricultural Calendar**: Farming season adaptations
- **Mobile Money**: Airtel Money/MTN integration
- **Multi-Grade Classes**: Combined classroom support

### 🔐 Security Features:
- **AES-256 Encryption**: Military-grade protection
- **TLS 1.3**: Latest security protocol
- **Offline Data Protection**: Secure local storage
- **Role-Based Access**: Granular permissions

### 📱 Progressive Web App:
- **Offline Functionality**: Works without internet
- **Mobile Responsive**: All device support
- **App Installation**: Install like native app
- **Background Sync**: Auto-sync when online

## 🗂️ Project Structure

```
school_management_systems/
├── school-management-api/          # Laravel Backend
│   ├── database/database.sqlite    # SQLite Database
│   ├── public/                     # Web root
│   └── config/                     # Configuration
├── school-management-frontend/     # Next.js Frontend
│   ├── app/                        # App Router pages
│   ├── components/                 # React components
│   └── lib/                        # Utilities
├── simple-frontend.html            # Simple HTML frontend
├── start-both.bat                  # Start both servers
├── start-backend.bat               # Start backend only
└── start-simple-frontend.bat       # Open simple frontend
```

## 🔍 Troubleshooting

### Backend Issues:
- **Port 8000 in use**: Change port in start-backend.bat
- **Database errors**: Check database/database.sqlite exists
- **Permission errors**: Run as administrator

### Frontend Issues:
- **Node.js not found**: Install from nodejs.org
- **npm install fails**: Clear node_modules and retry
- **Port 3000 in use**: Use `npm run dev -- -p 3001`

### Connection Issues:
- **CORS errors**: Backend includes CORS headers
- **API not responding**: Ensure backend is running
- **Firewall blocking**: Allow localhost connections

## 📊 API Endpoints

### Authentication:
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Students:
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `PUT /api/students/{id}` - Update student

### Teachers:
- `GET /api/teachers` - List teachers
- `POST /api/teachers` - Create teacher

### Classes:
- `GET /api/classes` - List classes
- `POST /api/classes` - Create class

## 🎯 Next Steps

1. **Install Node.js** for full frontend experience
2. **Test all user roles** with provided credentials
3. **Explore offline functionality** (disconnect internet)
4. **Review Zambian-specific features** in the interface
5. **Check mobile responsiveness** on different devices

## 📞 Support

For issues or questions:
- Check this guide first
- Review error messages in browser console
- Ensure all prerequisites are installed
- Test with simple frontend before full setup

---

**🇿🇲 Building the Future of Education in Zambia - One School at a Time**
