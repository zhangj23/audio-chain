# Frontend-Backend Integration Guide

This document outlines the complete integration between the Weave frontend (React Native/Expo) and backend (FastAPI).

## 🚀 **Integration Overview**

### **✅ Completed Integrations**

1. **Authentication System**

   - Login/Signup with backend API
   - JWT token management with AsyncStorage
   - Authentication context and guards
   - Account deletion functionality

2. **API Service Layer**

   - Comprehensive API service with TypeScript types
   - Centralized configuration
   - Error handling and retry logic
   - Token management

3. **Group Management**
   - Create/join/leave groups
   - Real-time group data from backend
   - Loading states and error handling
   - Pull-to-refresh functionality

### **🔄 In Progress**

4. **Video Submission** (Next)

   - Video upload to S3 via presigned URLs
   - Integration with camera/recording
   - Progress tracking

5. **Video Compilation** (Next)
   - Generate compilations
   - Status tracking
   - Download/view compiled videos

## 📁 **File Structure**

```
client/
├── services/
│   └── api.ts                 # Main API service
├── contexts/
│   ├── AuthContext.tsx        # Authentication state
│   └── GroupsContext.tsx      # Groups state
├── components/
│   └── AuthGuard.tsx          # Authentication routing
├── config/
│   └── api.ts                   # API configuration
└── app/
    ├── auth.tsx             # Login screen
    ├── signup.tsx           # Signup screen
    └── (tabs)/
        └── index.tsx        # Home screen with groups
```

## 🔧 **Configuration**

### **Environment Variables**

Create a `.env` file in the `client` directory:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000

# Development Settings
EXPO_PUBLIC_SKIP_AUTH=false
```

### **API Configuration**

The API service is configured in `client/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000",
  SKIP_AUTH: process.env.EXPO_PUBLIC_SKIP_AUTH === "true",
  // ... endpoints and settings
};
```

## 🔐 **Authentication Flow**

1. **Login/Signup**: User enters credentials
2. **API Call**: Frontend calls backend auth endpoints
3. **Token Storage**: JWT token stored in AsyncStorage
4. **Context Update**: AuthContext updates user state
5. **Route Protection**: AuthGuard handles navigation
6. **API Requests**: All requests include Bearer token

## 📱 **Key Features**

### **Authentication**

- ✅ Email/password login
- ✅ User registration
- ✅ JWT token management
- ✅ Account deletion
- ✅ Automatic token refresh
- ✅ Logout functionality

### **Group Management**

- ✅ List user's groups
- ✅ Create new groups
- ✅ Join/leave groups
- ✅ Real-time data updates
- ✅ Loading states
- ✅ Error handling
- ✅ Pull-to-refresh

### **Video Features** (Next)

- 🔄 Video recording/upload
- 🔄 S3 integration
- 🔄 Compilation generation
- 🔄 Status tracking
- 🔄 Download/view videos

## 🛠 **Usage Examples**

### **Using Authentication**

```typescript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    try {
      await login("user@example.com", "password");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };
}
```

### **Using Groups**

```typescript
import { useGroups } from "@/contexts/GroupsContext";

function MyComponent() {
  const { groups, createGroup, joinGroup, isLoading } = useGroups();

  const handleCreateGroup = async () => {
    try {
      await createGroup("My Group", "Description");
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };
}
```

### **Direct API Usage**

```typescript
import { apiService } from "@/services/api";

// Get current user
const user = await apiService.getCurrentUser();

// Create a group
const group = await apiService.createGroup("Group Name");

// Submit a video
const submission = await apiService.submitVideo(groupId, videoFile, duration);
```

## 🔄 **State Management**

### **Authentication State**

- `user`: Current user object
- `isAuthenticated`: Boolean auth status
- `isLoading`: Loading state
- `error`: Error messages

### **Groups State**

- `groups`: Array of user's groups
- `isLoading`: Loading state
- `error`: Error messages
- Methods: `createGroup`, `joinGroup`, `leaveGroup`, etc.

## 🚨 **Error Handling**

All API calls include comprehensive error handling:

1. **Network Errors**: Connection issues
2. **Authentication Errors**: Invalid tokens
3. **Validation Errors**: Invalid data
4. **Server Errors**: Backend issues

Errors are displayed to users with retry options where appropriate.

## 🔧 **Development Setup**

1. **Install Dependencies**:

   ```bash
   cd client
   npm install
   ```

2. **Configure Environment**:

   ```bash
   # Create .env file
   echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env
   ```

3. **Start Development Server**:
   ```bash
   npm start
   ```

## 🧪 **Testing**

### **API Testing**

- Use the backend API directly
- Test authentication flows
- Verify group operations
- Check error handling

### **Frontend Testing**

- Test authentication screens
- Verify group loading
- Check error states
- Test navigation flows

## 📋 **Next Steps**

1. **Video Upload Integration**

   - Camera/recording integration
   - S3 upload with progress tracking
   - Error handling

2. **Video Compilation**

   - Generate compilations
   - Status polling
   - Download functionality

3. **Enhanced UI**

   - Better loading states
   - Improved error messages
   - Offline support

4. **Testing**
   - Unit tests for contexts
   - Integration tests
   - E2E testing

## 🐛 **Troubleshooting**

### **Common Issues**

1. **API Connection Failed**

   - Check backend server is running
   - Verify API_URL in .env
   - Check network connectivity

2. **Authentication Issues**

   - Clear AsyncStorage
   - Check token expiration
   - Verify backend auth endpoints

3. **Group Loading Issues**
   - Check user authentication
   - Verify backend group endpoints
   - Check network requests

### **Debug Tools**

- React Native Debugger
- Network tab in dev tools
- Console logs for API calls
- AsyncStorage inspection

## 📚 **Resources**

- [Expo Router Documentation](https://expo.github.io/router/)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)

---

**Status**: Frontend-Backend integration is 60% complete. Authentication and group management are fully integrated. Video features are next.
