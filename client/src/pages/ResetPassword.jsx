import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setMessage(
        'Password must be at least 8 characters.'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await api.post(
        `/auth/reset-password/${token}`,
        { password }
      );

      setMessage(
        response.data.message ||
        'Password reset successfully.'
      );

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
        'Unable to reset password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Reset Password</h1>

      <form onSubmit={handleSubmit}>
        <label>
          New Password
          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            minLength={8}
            required
          />
        </label>

        <label>
          Confirm Password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            minLength={8}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Resetting...'
            : 'Reset Password'}
        </button>
      </form>

      {message && (
        <p>{message}</p>
      )}

      <Link to="/login">
        Back to Login
      </Link>
    </main>
  );
}