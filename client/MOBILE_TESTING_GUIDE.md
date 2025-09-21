# 📱 Mobile Testing Guide for Weave App

## 🚨 The Problem

When testing on mobile devices (physical device or emulator), `localhost:8000` doesn't work because:

- **Physical Device**: `localhost` refers to the device itself, not your computer
- **Android Emulator**: `localhost` refers to the emulator, not your computer
- **iOS Simulator**: `localhost` should work, but may have issues

## ✅ The Solution

### **Step 1: Find Your Computer's IP Address**

```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Look for your **Wi-Fi adapter** IP address (e.g., `192.168.1.100` or `129.161.69.14`)

### **Step 2: Update Frontend Configuration**

Create/update `client/.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:8000
EXPO_PUBLIC_SKIP_AUTH=false
```

**Example:**

```env
EXPO_PUBLIC_API_URL=http://129.161.69.14:8000
EXPO_PUBLIC_SKIP_AUTH=false
```

### **Step 3: Restart Frontend**

```bash
cd client
npm start
```

## 🔧 Platform-Specific Solutions

### **Android Emulator**

- Use your computer's IP address: `http://192.168.1.100:8000`
- **Alternative**: Use `http://10.0.2.2:8000` (special IP for host machine)

### **iOS Simulator**

- Use your computer's IP address: `http://192.168.1.100:8000`
- **Alternative**: `http://localhost:8000` might work

### **Physical Device**

- **Must use your computer's IP address**: `http://192.168.1.100:8000`
- Both devices must be on the same network
- Check firewall settings

## 🧪 Testing Steps

### **1. Test Backend from Computer**

```bash
curl http://YOUR_IP_ADDRESS:8000
# Should return: {"message":"Weave API is running!"}
```

### **2. Test from Mobile Device**

- Open browser on mobile device
- Go to: `http://YOUR_IP_ADDRESS:8000`
- Should show the same JSON response

### **3. Test Frontend App**

- Use the NetworkTest component on the home screen
- Should show "✅ Backend connected"

## 🚨 Common Issues & Solutions

### **"Network request failed"**

- **Cause**: Wrong IP address or backend not running
- **Fix**: Check IP address and restart backend

### **"Connection refused"**

- **Cause**: Backend not running or firewall blocking
- **Fix**: Start backend with `--host 0.0.0.0`

### **"Timeout"**

- **Cause**: Network too slow or firewall blocking
- **Fix**: Check firewall settings, try different port

### **"CORS error"**

- **Cause**: CORS not configured (already fixed in backend)
- **Fix**: Backend already has CORS configured

## 🔥 Quick Fixes

### **Fix 1: Update IP Address**

```bash
# Find your IP
ipconfig

# Update .env file
echo "EXPO_PUBLIC_API_URL=http://YOUR_IP:8000" > client/.env

# Restart frontend
cd client && npm start
```

### **Fix 2: Test Connectivity**

```bash
# Test from computer
curl http://YOUR_IP:8000

# Test from mobile browser
# Go to: http://YOUR_IP:8000
```

### **Fix 3: Check Firewall**

- Windows Defender Firewall
- Antivirus software
- Corporate firewall
- Router firewall

## 📱 Current Configuration

### **Your Setup:**

- **Computer IP**: `129.161.69.14`
- **Backend URL**: `http://129.161.69.14:8000`
- **Frontend**: Updated to use IP address

### **Test Commands:**

```bash
# Test backend
curl http://129.161.69.14:8000

# Test from mobile browser
# Go to: http://129.161.69.14:8000
```

## 🎯 Expected Results

### **✅ Working Setup:**

- Backend accessible from mobile device
- Frontend can make API calls
- NetworkTest shows "✅ Backend connected"
- Authentication works
- Groups load successfully

### **❌ Still Failing:**

- Check IP address is correct
- Verify backend is running on `0.0.0.0:8000`
- Check firewall settings
- Try different port (8001, 3001)

## 🔍 Debugging Tools

### **1. NetworkTest Component**

- Added to home screen
- Tests basic connectivity
- Tests auth endpoint

### **2. Browser Testing**

- Open mobile browser
- Go to backend URL
- Should show JSON response

### **3. Backend Logs**

- Check terminal where backend is running
- Look for incoming requests

### **4. Expo Dev Tools**

- Shows network requests
- Displays error messages
- Network tab for debugging

## 🚀 Next Steps

1. **Test the NetworkTest component** on your mobile device
2. **Try signing up** with a new account
3. **Check if groups load** properly
4. **Report any remaining issues**

The mobile connectivity should now work! 🎉
