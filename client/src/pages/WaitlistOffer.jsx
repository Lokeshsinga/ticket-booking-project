import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

export default function WaitlistOffer() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const acceptOffer = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await api.post(
        `/waitlist/offers/${token}/accept`
      );

      setMessage('Waitlist offer accepted successfully!');

      setTimeout(() => {
        navigate('/bookings');
      }, 1000);

      console.log('Booking:', response.data.booking);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
        'This waitlist offer is invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Waitlist Offer</h1>

      <p>
        A seat has become available for you.
      </p>

      <p>
        Accept the offer before it expires.
      </p>

      <button
        onClick={acceptOffer}
        disabled={loading}
      >
        {loading ? 'Accepting...' : 'Accept Offer'}
      </button>

      {message && <p>{message}</p>}
    </main>
  );
}