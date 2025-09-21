import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface ProfileContextType {
  profileImage: string | null;
  setProfileImage: (image: string | null) => void;
  userName: string;
  setUserName: (name: string) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setUserName(user.username || user.email);
      if ((user as any).profile_pic_url) {
        setProfileImage((user as any).profile_pic_url);
      }
    }
  }, [user]);

  return (
    <ProfileContext.Provider value={{
      profileImage,
      setProfileImage,
      userName,
      setUserName,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
