import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    try {
      const response = await api.post(
        '/auth/forgot-password',
        { email }
      );

      setMessage(
        response.data.message ||
        'If an account exists, a reset link has been sent.'
      );
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
        'Unable to process your request.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Forgot Password?</h1>

      <p>
        Enter your email address and we'll send you
        a password reset link.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="you@example.com"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Sending...'
            : 'Send Reset Link'}
        </button>
      </form>

      {message && <p>{message}</p>}

      <Link to="/login">
        Back to Login
      </Link>
    </main>
  );
}