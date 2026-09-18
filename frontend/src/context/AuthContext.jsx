import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      if (clerkUser) {
        setUser({
          id: clerkUser.id,
          name: clerkUser.fullName || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Student',
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          avatar_url: clerkUser.imageUrl,
          course: 'BCA',
          semester: '4th',
          division: 'A',
          points: 120,
          streak: 3
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }
  }, [clerkUser, isLoaded]);

  const login = async (email, password) => {
    return { success: true };
  };

  const register = async (userData) => {
    return { success: true };
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser(prev => ({ ...prev, ...updatedFields }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

