import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { User, UserRole } from '../types';

interface RegistrationResponse {
  message: string;
  verification_otp?: string;
  expires_in_minutes?: number;
  user: User;
}

interface DemoOtpResponse {
  email: string;
  demo_otp: string;
  expires_in_minutes: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: any) => Promise<RegistrationResponse>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: any) => Promise<void>;
  googleLogin: (token: string, role: UserRole) => Promise<void>;
  demoLogin: (
    role: Extract<UserRole, 'candidate' | 'recruiter'>
  ) => Promise<void>;
  demoRecruiterOtp: () => Promise<DemoOtpResponse>;
  updateUserProfile: (profileData: any) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    const accessToken =
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token');

    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/users/me/');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe = false
  ) => {
    setLoading(true);

    try {
      const response = await api.post('/auth/login/', {
        email,
        password,
      });

      const { access, refresh, user: userData } = response.data;

      if (rememberMe) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
      } else {
        sessionStorage.setItem('access_token', access);
        sessionStorage.setItem('refresh_token', refresh);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }

      setUser(userData);
    } catch (error: any) {
      throw error.response?.data || error.message;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any): Promise<RegistrationResponse> => {
    try {
      const response = await api.post('/auth/register/', data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  };

  const verifyEmail = async (email: string, otp: string) => {
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-email/', {
        email,
        otp,
      });

      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');

      setUser(userData);
    } catch (error: any) {
      throw error.response?.data || error.message;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refresh =
      localStorage.getItem('refresh_token') ||
      sessionStorage.getItem('refresh_token');

    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await api.post('/auth/forgot-password/', { email });
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  };

  const resetPassword = async (data: any) => {
    try {
      await api.post('/auth/reset-password/', data);
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  };

  const googleLogin = async (token: string, role: UserRole) => {
    setLoading(true);

    try {
      const response = await api.post('/auth/google/', {
        token,
        role,
      });

      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      setUser(userData);
    } catch (error: any) {
      throw error.response?.data || error.message;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (
    role: Extract<UserRole, 'candidate' | 'recruiter'>
  ) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    setLoading(true);

    try {
      const response = await api.post('/auth/demo/', {
        role,
      });

      const { access, refresh, user: userData } = response.data;

      sessionStorage.setItem('access_token', access);
      sessionStorage.setItem('refresh_token', refresh);

      setUser(userData);
    } catch (error: any) {
      console.error('Demo login failed:', error);
      throw error.response?.data || error.message;
    } finally {
      setLoading(false);
    }
  };

  const demoRecruiterOtp = async (): Promise<DemoOtpResponse> => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    try {
      const response = await api.post('/auth/demo-otp/', { role: 'recruiter' });
      return response.data as DemoOtpResponse;
    } catch (error: any) {
      console.error('Recruiter demo OTP creation failed:', error);
      throw error.response?.data || error.message;
    }
  };

  const updateUserProfile = async (profileData: any) => {
    try {
      const response = await api.put(
        '/users/me/profile/',
        profileData
      );

      if (user) {
        setUser({
          ...user,
          profile: {
            ...user.profile,
            ...response.data,
          },
        });
      }
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyEmail,
        logout,
        forgotPassword,
        resetPassword,
        googleLogin,
        demoLogin,
        demoRecruiterOtp,
        updateUserProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
