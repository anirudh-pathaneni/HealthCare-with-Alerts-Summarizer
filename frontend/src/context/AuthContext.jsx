import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem('authToken');
            if (savedToken) {
                try {
                    const verifyResult = await authApi.verify(savedToken);
                    if (verifyResult.valid && verifyResult.user) {
                        // User data comes from verify endpoint now
                        setUser(verifyResult.user);
                        setToken(savedToken);
                    } else {
                        // Token invalid, clear it
                        localStorage.removeItem('authToken');
                    }
                } catch (error) {
                    console.error('Auth verification failed:', error);
                    // Auth service might be down, clear token
                    localStorage.removeItem('authToken');
                    setAuthError('Authentication service unavailable');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (username, password) => {
        setAuthError(null);
        try {
            const response = await authApi.login(username, password);
            const { access_token, user: userData } = response;

            localStorage.setItem('authToken', access_token);
            setToken(access_token);
            setUser(userData);

            return { success: true };
        } catch (error) {
            console.error('Login failed:', error);
            const errorMsg = error.response?.data?.detail ||
                (error.code === 'ERR_NETWORK' ? 'Auth service unavailable. Try again later.' : 'Login failed');
            return {
                success: false,
                error: errorMsg
            };
        }
    };

    const logout = async () => {
        try {
            if (token) {
                await authApi.logout(token).catch(() => { });
            }
        } finally {
            localStorage.removeItem('authToken');
            setToken(null);
            setUser(null);
        }
    };

    const value = {
        user,
        token,
        loading,
        authError,
        isAuthenticated: !!user && !!token,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
