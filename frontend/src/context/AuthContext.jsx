import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/react';
import api, { setTokenGetter, setCurrentUser, setCurrentUserId } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hook Clerk's getToken into Axios interceptor
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  const refreshUser = useCallback(async () => {
    if (!clerkUser) {
      setUser(null);
      return null;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const name = clerkUser.fullName || clerkUser.firstName || email.split('@')[0] || 'User';

    setCurrentUser({ id: clerkUser.id, email, name });
    setCurrentUserId(clerkUser.id);

    try {
      const res = await api.get('/auth/me');
      if (res && res.success && res.data) {
        setUser(res.data);
        return res.data;
      }
    } catch (err) {
      console.warn('Notice: Backend /api/auth/me fetch:', err?.message || err);
      // Fallback object from Clerk user
      const fallback = {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        avatar_url: clerkUser.imageUrl,
        role: 'STUDENT',
        course: '',
        semester: '',
        division: '',
        points: 0,
        streak: 0,
        needsOnboarding: true
      };
      setUser(fallback);
      return fallback;
    }
  }, [clerkUser]);

  useEffect(() => {
    if (isLoaded) {
      if (clerkUser) {
        refreshUser().finally(() => setLoading(false));
      } else {
        setUser(null);
        setCurrentUserId(null);
        setLoading(false);
      }
    }
  }, [clerkUser, isLoaded, refreshUser]);

  const login = async () => {
    return { success: true };
  };

  const register = async () => {
    return { success: true };
  };

  const logout = async () => {
    await signOut();
    setUser(null);
    setCurrentUserId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (updatedFields) => {
    setUser(prev => ({ ...prev, ...updatedFields }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
