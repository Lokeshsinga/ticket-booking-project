import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

import { api } from '../services/api.js';
import SeatMap from '../components/SeatMap.jsx';

export default function SeatSelection() {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [hold, setHold] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL ||
        'http://localhost:4000'
    );

    api
      .get(`/shows/${showId}/seats`)
      .then((response) => {
        setSeats(response.data.seats);
      })
      .catch(() => {
        setMessage('Unable to load seats.');
      });

    socket.emit('show:join', showId);

    socket.on('seats:updated', (data) => {
      setSeats(data.seats);
    });

    return () => {
      socket.emit('show:leave', showId);
      socket.disconnect();
    };
  }, [showId]);

  useEffect(() => {
    if (!hold) return;

    const timer = setInterval(() => {
      const value = Math.max(
        0,
        new Date(hold.expiresAt).getTime() - Date.now()
      );

      setRemaining(value);

      if (value <= 0) {
        clearInterval(timer);
        setHold(null);
        setConfirming(false);
        setMessage(
          'Your seat hold expired. Please select your seats again.'
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hold]);

  const toggle = (id) => {
    if (confirming) return;

    setSelected((current) =>
      current.includes(id)
        ? current.filter((seatId) => seatId !== id)
        : [...current, id]
    );
  };

  const createHold = async () => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    if (!selected.length) return;

    try {
      setMessage('');

      const response = await api.post(
        `/shows/${showId}/holds`,
        {
          seatIds: selected
        }
      );

      setHold(response.data);
      setSelected([]);

      setMessage(
        'Seats held. Complete your mock payment before the timer ends.'
      );
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          'Unable to hold seats.'
      );

      setSelected([]);
    }
  };

  const confirm = async () => {
    if (!hold?.holdId || confirming) {
      return;
    }

    setConfirming(true);
    setMessage('Confirming your booking...');

    try {
      const response = await api.post('/bookings', {
        showId,
        holdId: hold.holdId
      });

      setHold(null);

      navigate('/bookings', {
        state: {
          reference: response.data.booking.reference
        }
      });
    } catch (error) {
      console.error(
        'Booking confirmation failed:',
        error
      );

      setConfirming(false);

      setMessage(
        error.response?.data?.error ||
          'Unable to confirm booking. Please try again.'
      );

      // Keep the hold if it is still valid.
    }
  };

  const categories = [
    ...new Set(
      seats
        .filter((seat) => seat.status !== 'AVAILABLE')
        .map((seat) => seat.category)
    )
  ];

  const join = async (category) => {
    try {
      await api.post(
        `/waitlist/shows/${showId}`,
        { category }
      );

      setMessage(
        `Added to the ${category} waitlist.`
      );
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          'Unable to join waitlist.'
      );
    }
  };

  return (
    <main>
      <h1>Select seats</h1>

      <p className="legend">
        Green available · Amber held · Red booked
      </p>

      <SeatMap
        seats={seats}
        selected={selected}
        onSelect={toggle}
      />

      {hold ? (
        <section>
          <p>
            Hold expires in{' '}
            {Math.ceil(remaining / 1000)} seconds.
          </p>

          <button
            onClick={confirm}
            disabled={confirming || remaining <= 0}
          >
            {confirming
              ? 'Confirming...'
              : 'Confirm mock payment'}
          </button>
        </section>
      ) : (
        <button
          disabled={!selected.length}
          onClick={createHold}
        >
          Hold selected seats
        </button>
      )}

      {message && <p>{message}</p>}

      {categories.map((category) => (
        <button
          className="secondary"
          key={category}
          onClick={() => join(category)}
          disabled={confirming}
        >
          Join {category} waitlist
        </button>
      ))}
    </main>
  );
}