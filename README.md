# Ticket Booking System

Production-oriented React/Express/MongoDB ticketing platform for movies and concerts.

## Run

Copy `.env.example` to `.env`, start MongoDB, then run `npm install`, `npm run dev`. Use `npm run build`, `npm test`, and `npm run lint` before submission.

## Core guarantees

- A show owns its per-show seat inventory. Atomic conditional updates make double holds impossible.
- Transactional confirmation rejects expired or foreign holds and creates the QR-backed booking atomically.
- A scheduled, idempotent worker releases holds and advances expired waitlist offers; Socket.IO broadcasts every seat-state change.
- Waitlists are FIFO per show/category. Unique indexes prevent duplicate entries and concurrent active offers.
- `EMAIL_MODE=console` logs messages locally; SMTP failures are recorded without rolling back bookings.

## API

`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` authenticate users. `POST /api/shows/:showId/holds` creates a hold. `POST /api/bookings` confirms `{showId, holdId}`. `POST /api/bookings/:id/cancel` cancels. `POST /api/waitlist/shows/:showId` joins `{category}`; the email token is accepted at `POST /api/waitlist/offers/:token/accept`.

Admins create venues; organisers create events/shows; customers browse and book. Required indexes include booking reference, per-show seat lookup, hold expiry lookup, waitlist FIFO, duplicate-entry prevention, and offer expiry lookup. See [System Design](docs/SYSTEM_DESIGN.md) for the concurrency and TTL design.

## Demo seed

With MongoDB running, execute `npm run seed`. This creates one arena, two shows, and local-only accounts: `customer@example.com`, `organiser@example.com`, and `admin@example.com`. All use `Password123!`; change or remove these accounts outside local development.
