import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Eye, EyeOff, Lock, User as UserIcon, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup } = useAuth();
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuickAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setIsSignUpMode(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUpMode) {
        const result = await signup({ username, email, password });
        if (!result.success) {
          setErrorMessage(result.message || 'Registration failed');
        }
      } else {
        const result = await login({ username, password });
        if (!result.success) {
          setErrorMessage(result.message || 'Invalid username or password');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <div className="login-card">
        <div className="card-header">
          <div className="brand-badge">
            <ShieldCheck className="badge-icon" size={24} />
            <span>INVENTORY MANAGEMENT SYSTEM</span>
          </div>
          <h1>{isSignUpMode ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="subtitle">
            {isSignUpMode
              ? 'Register to access the inventory system'
              : 'Enter your credentials to manage inventory'}
          </p>
        </div>

        {/* Quick Admin Helper Button */}
        <button type="button" className="quick-admin-btn" onClick={handleQuickAdmin}>
          <Sparkles size={16} />
          <span>Quick Admin Login (admin / admin123)</span>
        </button>

        {errorMessage && (
          <div className="error-banner">
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <UserIcon className="input-icon" size={18} />
              <input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {isSignUpMode && (
            <div className="form-group">
              <label htmlFor="email">Email Address (Optional)</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : isSignUpMode ? (
              <>
                <UserPlus size={18} />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="card-footer">
          <span>
            {isSignUpMode ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            className="switch-mode-btn"
            onClick={() => {
              setIsSignUpMode(!isSignUpMode);
              setErrorMessage(null);
            }}
          >
            {isSignUpMode ? 'Sign In' : 'Register now'}
          </button>
        </div>
      </div>
    </div>
  );
};
