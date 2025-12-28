/**
 * VerifyEmailPage Component
 * 
 * EMAIL VERIFICATION DISABLED - TODO: Re-enable in production
 * 
 * Page for verifying user email address using verification token from email.
 * Currently disabled - redirects to login page.
 */

import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login immediately since email verification is disabled
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎓 KAMPÜS+
          </h1>
          <p className="text-xl text-blue-100">
            Email Verification
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">ℹ️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Email Verification Disabled
            </h2>
            <p className="text-gray-600 mb-6">
              Email verification is currently disabled. You can login directly with your account.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting to login page...
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// EMAIL VERIFICATION DISABLED - Original implementation commented out
// Uncomment below when re-enabling email verification
/*
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/config';
import axios from 'axios';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('Verification token is missing. Please check your email and click the verification link again.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setStatus('loading');
    setMessage('Verifying your email address...');

    try {
      const response = await apiClient.post('/auth/verify-email', {
        token: verificationToken,
      });

      setStatus('success');
      setMessage('Email verified successfully! You can now login to your account.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        if (status === 400) {
          setMessage(
            errorData?.error?.message || 
            'Invalid or expired verification token. Please request a new verification email.'
          );
        } else {
          setMessage(
            errorData?.error?.message || 
            'Failed to verify email. Please try again or contact support.'
          );
        }
      } else {
        setMessage('Network error. Please check your connection and try again.');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setResendStatus('error');
      setResendMessage('Please enter your email address.');
      return;
    }

    setResendStatus('loading');
    setResendMessage('Sending verification email...');

    try {
      const response = await apiClient.post('/auth/resend-verification', {
        email: email,
      });

      setResendStatus('success');
      setResendMessage(
        response.data?.message || 
        'Verification email sent! Please check your inbox.'
      );
    } catch (error) {
      setResendStatus('error');
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        if (status === 429) {
          const retryAfter = errorData?.error?.retry_after || 3600;
          const minutes = Math.ceil(retryAfter / 60);
          setResendMessage(
            `Too many requests. Please try again after ${minutes} minute(s).`
          );
        } else if (status === 400) {
          setResendMessage(
            errorData?.error?.message || 
            'Unable to resend verification email. Please check your email address.'
          );
        } else {
          setResendMessage(
            errorData?.error?.message || 
            'Failed to resend verification email. Please try again later.'
          );
        }
      } else {
        setResendMessage('Network error. Please check your connection and try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎓 KAMPÜS+
          </h1>
          <p className="text-xl text-blue-100">
            Email Verification
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Email Verified!
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <p className="text-sm text-gray-500 mb-6">
                Redirecting to login page...
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
              >
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Verification Failed
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Resend Verification Email
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="your.email@ogr.selcuk.edu.tr"
                    />
                  </div>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'loading'}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {resendStatus === 'loading' ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                  
                  {resendStatus === 'success' && (
                    <div className="rounded-md bg-green-50 p-4">
                      <p className="text-sm text-green-800">{resendMessage}</p>
                    </div>
                  )}
                  
                  {resendStatus === 'error' && (
                    <div className="rounded-md bg-red-50 p-4">
                      <p className="text-sm text-red-800">{resendMessage}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Preparing verification...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
*/

