# Network Issues Debug Guide

## 🚨 Common Network Issues and Solutions

### **1. Backend Server Not Running**

**Problem**: `Network request failed` or `Connection refused`
**Solution**:

```bash
cd app
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **2. Wrong API URL**

**Problem**: Frontend trying to connect to wrong URL
**Solutions**:

- **For Physical Device**: Use your computer's IP address instead of localhost
- **For Emulator**: Use `10.0.2.2:8000` (Android) or `localhost:8000` (iOS)
- **For Web**: Use `localhost:8000`

### **3. CORS Issues**

**Problem**: CORS errors in browser console
**Solution**: Backend already configured with CORS middleware allowing all origins

### **4. Firewall/Network Issues**

**Problem**: Network blocked by firewall
**Solutions**:

- Check Windows Firewall settings
- Try different port (e.g., 8001)
- Use `--host 0.0.0.0` (already configured)

### **5. Mobile Device Network Issues**

**Problem**: Mobile device can't reach localhost
**Solutions**:

- Use computer's IP address: `http://192.168.1.XXX:8000`
- Find IP with: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Update `EXPO_PUBLIC_API_URL` in `.env` file

## 🔧 Debug Steps

### **Step 1: Test Backend**

```bash
# Test if backend is running
curl http://localhost:8000
# Should return: {"message":"Weave API is running!"}
```

### **Step 2: Test from Browser**

Open: `http://localhost:8000/docs`
Should show Swagger UI

### **Step 3: Test from Frontend**

Use the NetworkTest component to test connectivity

### **Step 4: Check Network Configuration**

```bash
# Find your computer's IP address
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

### **Step 5: Update Frontend Configuration**

Create/update `client/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

## 📱 Platform-Specific Solutions

### **Android Emulator**

- Use `http://10.0.2.2:8000`
- This is the special IP for host machine from Android emulator

### **iOS Simulator**

- Use `http://localhost:8000`
- Should work directly

### **Physical Device**

- Use your computer's actual IP address
- Both devices must be on same network
- Example: `http://192.168.1.100:8000`

### **Web Browser**

- Use `http://localhost:8000`
- Should work directly

## 🐛 Common Error Messages

### **"Network request failed"**

- Backend not running
- Wrong URL
- Firewall blocking

### **"Connection refused"**

- Backend not running
- Wrong port
- Service not listening

### **"CORS error"**

- Backend CORS not configured (already fixed)
- Wrong origin

### **"Timeout"**

- Network too slow
- Backend overloaded
- Firewall blocking

## 🔍 Debugging Tools

### **1. Network Test Component**

Added to home screen for testing connectivity

### **2. Browser Dev Tools**

- Network tab shows failed requests
- Console shows error messages

### **3. Backend Logs**

Check terminal where backend is running for errors

### **4. Expo Dev Tools**

- Shows network requests
- Displays error messages

## 🚀 Quick Fixes

### **Fix 1: Restart Everything**

```bash
# Stop all processes
# Restart backend
cd app
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Restart frontend
cd client
npm start
```

### **Fix 2: Use IP Address**

```bash
# Find your IP
ipconfig
# Update .env file with your IP
```

### **Fix 3: Check Port**

```bash
# Test if port is open
netstat -an | findstr :8000
```

### **Fix 4: Disable Firewall Temporarily**

- Windows Defender Firewall
- Antivirus software
- Corporate firewall

## 📞 Still Having Issues?

1. **Check backend logs** for errors
2. **Test with curl/Postman** first
3. **Try different port** (8001, 3001)
4. **Use different host** (127.0.0.1 instead of localhost)
5. **Check network connectivity** between devices

## 🎯 Expected Behavior

### **Working Setup:**

- Backend: `http://localhost:8000` returns JSON
- Frontend: Can make API calls successfully
- Network Test: Shows "✅ Backend connected"

### **Common Issues:**

- Backend not running
- Wrong URL in frontend
- Network connectivity issues
- Firewall blocking requests
