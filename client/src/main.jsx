import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Link
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

import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <header>
        <Link to="/">Ticketly</Link>
        <Link to="/bookings">My bookings</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </header>

      <Routes>
        <Route path="/" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/shows/:showId" element={<SeatSelection />} />
        <Route path="/login" element={<Login />} />
        <Route
  path="/forgot-password"
  element={<ForgotPassword />}
/>
        <Route path="/register" element={<Register />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
  path="/reset-password/:token"
  element={<ResetPassword />}
/>

        {/* Waitlist offer acceptance */}
        <Route
          path="/waitlist/offer/:token"
          element={<WaitlistOffer />}
        />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);