import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function Login() {
  const [e, setE] = useState('');
  const [p, setP] = useState('');
  const [error, setError] = useState('');

  const go = useNavigate();

  const submit = async (event) => {
    event.preventDefault();

    try {
      const response = await api.post('/auth/login', {
        email: e,
        password: p
      });

      localStorage.setItem(
        'token',
        response.data.token
      );

      go('/');
    } catch (error) {
      setError(
        error.response?.data?.error ||
        'Unable to login.'
      );
    }
  };

  return (
    <main>
      <h1>Login</h1>

      <form onSubmit={submit}>
        <input
          placeholder="Email"
          type="email"
          value={e}
          onChange={(event) =>
            setE(event.target.value)
          }
          required
        />

        <input
          placeholder="Password"
          type="password"
          value={p}
          onChange={(event) =>
            setP(event.target.value)
          }
          required
        />

        <button type="submit">
          Login
        </button>

        {error && <p>{error}</p>}
      </form>

      <p>
        <Link to="/forgot-password">
          Forgot Password?
        </Link>
      </p>

      <p>
        Don't have an account?{' '}
        <Link to="/register">
          Register
        </Link>
      </p>
    </main>
  );
}