import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';

import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Events from './pages/Events.jsx';
import EventDetails from './pages/EventDetails.jsx';
import SeatSelection from './pages/SeatSelection.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Bookings from './pages/Bookings.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WaitlistOffer from './pages/WaitlistOffer.jsx';

import {
  socket,
  connectUser,
  disconnectUser
} from './services/socket.js';

import './styles.css';


function AppContent() {
  const [waitlistOffer, setWaitlistOffer] =
    useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token =
      localStorage.getItem('token');

    if (!token) {
      return;
    }

    let userId;

    try {
      const payload = JSON.parse(
        atob(token.split('.')[1])
      );

      userId = payload.id;

      if (!userId) {
        return;
      }

      // Connect this browser to the user's
      // private Socket.IO room.
      connectUser(userId);

      const handleWaitlistOffer = (offer) => {
        console.log(
          'Waitlist offer received:',
          offer
        );

        setWaitlistOffer(offer);
      };

      socket.on(
        'waitlist:offer',
        handleWaitlistOffer
      );

      return () => {
        socket.off(
          'waitlist:offer',
          handleWaitlistOffer
        );

        disconnectUser(userId);
      };
    } catch (error) {
      console.error(
        'Waitlist socket error:',
        error
      );
    }
  }, []);

  const acceptWaitlistOffer = () => {
    if (!waitlistOffer?.offerToken) {
      return;
    }

    navigate(
      `/waitlist/offer/${waitlistOffer.offerToken}`
    );

    setWaitlistOffer(null);
  };

  const closeNotification = () => {
    setWaitlistOffer(null);
  };

  return (
    <>
      <header>
        <Link to="/">Ticketly</Link>
        <Link to="/bookings">My bookings</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </header>

      {/* Real-time waitlist notification */}
      {waitlistOffer && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            width: '320px',
            padding: '20px',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '10px',
            boxShadow:
              '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          <h3>
            🔔 Seat Available!
          </h3>

          <p>
            Your waitlist seat{' '}
            <strong>
              {waitlistOffer.seatId}
            </strong>{' '}
            is now available.
          </p>

          <p>
            Category:{' '}
            <strong>
              {waitlistOffer.category}
            </strong>
          </p>

          <p>
            Reserved until:{' '}
            {new Date(
              waitlistOffer.expiresAt
            ).toLocaleTimeString()}
          </p>

          <button
            onClick={acceptWaitlistOffer}
          >
            Accept {waitlistOffer.seatId}
          </button>

          <button
            onClick={closeNotification}
            style={{
              marginLeft: '8px'
            }}
          >
            Later
          </button>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={<Events />}
        />

        <Route
          path="/events/:id"
          element={<EventDetails />}
        />

        <Route
          path="/shows/:showId"
          element={<SeatSelection />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/bookings"
          element={<Bookings />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/reset-password/:token"
          element={<ResetPassword />}
        />

        <Route
          path="/waitlist/offer/:token"
          element={<WaitlistOffer />}
        />
      </Routes>
    </>
  );
}


function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}


createRoot(
  document.getElementById('root')
).render(
  <App />
);