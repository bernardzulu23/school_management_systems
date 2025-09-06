# 🔧 Troubleshooting Guide: Authentication & Project Issues

## 🚨 **Current Issues Identified**

### **1. Server Configuration Issues**
- ✅ **Backend**: Running on http://localhost:8000
- ✅ **Frontend**: Running on http://localhost:3002 (instead of 3000)
- ⚠️ **Port Conflict**: Multiple Next.js instances may be running

### **2. Authentication Issues**
- ⚠️ **CORS Configuration**: May need adjustment for port 3002
- ⚠️ **API Connection**: Frontend may not be connecting to backend properly

## 🔧 **Step-by-Step Fix**

### **Step 1: Clean Up Running Processes**

1. **Stop all running servers**:
   - Press `Ctrl+C` in all terminal windows
   - Or close all terminal windows

2. **Kill any remaining Node.js processes**:
   ```bash
   # In Command Prompt or PowerShell
   taskkill /f /im node.exe
   taskkill /f /im php.exe
   ```

### **Step 2: Restart Servers Properly**

1. **Start Backend Server**:
   ```bash
   cd school-management-api
   php -S localhost:8000 -t public
   ```
   
   **Expected Output**:
   ```
   PHP 8.x.x Development Server (http://localhost:8000) started
   ```

2. **Start Frontend Server**:
   ```bash
   cd school-management-frontend
   npm run dev
   ```
   
   **Expected Output**:
   ```
   ▲ Next.js 14.0.0
   - Local: http://localhost:3000
   ✓ Ready in X.Xs
   ```

### **Step 3: Test API Connection**

1. **Open the API test page**: `file:///d:/Mobile%20Apps/school_management_systems/test-api.html`
2. **Click "Test Login"** button
3. **Expected Response**:
   ```json
   {
     "success": true,
     "data": {
       "user": {
         "id": "1",
         "name": "John Smith",
         "email": "headteacher@school.com",
         "role": "headteacher"
       },
       "token": "test_token_..."
     }
   }
   ```

### **Step 4: Test Frontend Login**

1. **Go to**: http://localhost:3000/login
2. **Use credentials**:
   - Email: `headteacher@school.com`
   - Password: `password123`
3. **Should redirect** to appropriate dashboard

## 🔑 **Test Credentials**

| Role | Email | Password |
|------|-------|----------|
| Headteacher | headteacher@school.com | password123 |
| HOD | hod@school.com | password123 |
| Teacher | teacher@school.com | password123 |
| Student | student@school.com | password123 |

## 🐛 **Common Issues & Solutions**

### **Issue 1: "Port 3000 is in use"**
**Solution**: 
- Kill existing Node.js processes
- Or use the port shown (e.g., 3002)
- Update CORS settings if needed

### **Issue 2: "CORS Error"**
**Solution**: 
- Backend CORS is set to allow all origins (`*`)
- If still having issues, restart backend server

### **Issue 3: "Network Error" or "Failed to fetch"**
**Solution**: 
- Check if backend is running on port 8000
- Verify API URL in `.env.local`
- Check browser console for detailed errors

### **Issue 4: "Login Failed" or "Invalid Credentials"**
**Solution**: 
- Use exact test credentials above
- Check browser network tab for API response
- Verify backend is returning proper JSON

### **Issue 5: "Hydration Error"**
**Solution**: 
- Already fixed with `suppressHydrationWarning={true}`
- Clear browser cache if persisting

## 📊 **Debugging Steps**

### **1. Check Backend Status**
```bash
# Test if backend is responding
curl http://localhost:8000
# Should return: {"error": "Endpoint not found"}
```

### **2. Check Frontend Status**
```bash
# Open in browser
http://localhost:3000
# Should show school management landing page
```

### **3. Check API Endpoints**
```bash
# Test login endpoint
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"headteacher@school.com","password":"password123"}' \
  http://localhost:8000/api/v1/auth/login
```

### **4. Browser Console Debugging**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed requests

## 🔧 **Quick Fix Commands**

### **Windows Command Prompt**:
```cmd
# Kill all Node.js processes
taskkill /f /im node.exe

# Start backend
cd school-management-api
php -S localhost:8000 -t public

# In new terminal, start frontend
cd school-management-frontend
npm run dev
```

### **PowerShell**:
```powershell
# Kill processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start servers (use separate terminals)
cd school-management-api; php -S localhost:8000 -t public
cd school-management-frontend; npm run dev
```

## ✅ **Success Indicators**

### **Backend Working**:
- ✅ Terminal shows: "PHP Development Server started"
- ✅ http://localhost:8000 returns JSON error (expected)
- ✅ Login API returns user data

### **Frontend Working**:
- ✅ Terminal shows: "Ready in X.Xs"
- ✅ http://localhost:3000 shows landing page
- ✅ Login page loads without errors

### **Authentication Working**:
- ✅ Login with test credentials succeeds
- ✅ Redirects to appropriate dashboard
- ✅ User data is stored in browser

## 📞 **If Still Having Issues**

1. **Check Windows Firewall**: May be blocking connections
2. **Antivirus Software**: May be interfering
3. **Port Conflicts**: Other applications using ports 3000/8000
4. **Node.js Version**: Ensure compatible version (16+)
5. **PHP Version**: Ensure PHP 7.4+ is installed

## 🎯 **Expected Final State**

- **Backend**: http://localhost:8000 ✅
- **Frontend**: http://localhost:3000 ✅
- **Login**: Working with test credentials ✅
- **Dashboards**: Accessible after login ✅
- **API**: Responding to requests ✅

Follow these steps in order, and your school management system should be working perfectly! 🎉
