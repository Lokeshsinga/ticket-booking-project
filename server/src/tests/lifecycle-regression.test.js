import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import crypto from 'node:crypto';
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(process.cwd(), '../.mongodb-binaries');
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Venue } from '../models/Venue.js';
import { Event } from '../models/Event.js';
import { Show } from '../models/Show.js';
import { WaitlistEntry, WaitlistOffer } from '../models/Waitlist.js';
import { Booking } from '../models/Booking.js';
import { releaseExpiredHolds, acceptOffer } from '../services/bookingService.js';

let repl;
let customer;
let show;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await repl.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  customer = await User.create({ name: 'Customer', email: 'customer@example.com', passwordHash: await bcrypt.hash('password123', 4) });
  const venue = await Venue.create({ name: 'Hall', seats: [{ seatId: 'A1', category: 'Premium' }] });
  const event = await Event.create({ title: 'Event', type: 'CONCERT', organiser: customer._id });
  show = await Show.create({ event: event._id, venue: venue._id, startsAt: new Date(Date.now() + 86400000), seats: [{ seatId: 'A1', category: 'Premium', price: 100 }] });
});

describe('booking lifecycle regressions', () => {
  it('does not release an expired waitlist offer as a normal hold', async () => {
    const entry = await WaitlistEntry.create({ show: show._id, user: customer._id, category: 'Premium', status: 'OFFERED' });
    const token = 'offer-token';
    const offer = await WaitlistOffer.create({ show: show._id, entry: entry._id, user: customer._id, seatId: 'A1', tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60000) });
    await Show.updateOne({ _id: show._id }, { $set: { 'seats.0.status': 'HELD', 'seats.0.holdId': `offer:${offer._id}`, 'seats.0.heldBy': customer._id, 'seats.0.holdExpiresAt': new Date(Date.now() - 1) } });
    await releaseExpiredHolds();
    const current = await Show.findById(show._id);
    expect(current.seats[0].holdId).toBe(`offer:${offer._id}`);
  });

  it('allows only one concurrent acceptance of an offer', async () => {
    const entry = await WaitlistEntry.create({ show: show._id, user: customer._id, category: 'Premium', status: 'OFFERED' });
    const token = 'offer-token';
    const offer = await WaitlistOffer.create({ show: show._id, entry: entry._id, user: customer._id, seatId: 'A1', tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60000) });
    await Show.updateOne({ _id: show._id }, { $set: { 'seats.0.status': 'HELD', 'seats.0.holdId': `offer:${offer._id}`, 'seats.0.heldBy': customer._id, 'seats.0.holdExpiresAt': new Date(Date.now() + 60000) } });
    const results = await Promise.allSettled([acceptOffer({ token, userId: customer._id }), acceptOffer({ token, userId: customer._id })]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await Booking.countDocuments()).toBe(1);
  });
});
