import crypto from 'crypto';
import mongoose from 'mongoose';
import QRCode from 'qrcode';

import { Show } from '../models/Show.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import {
  WaitlistEntry,
  WaitlistOffer
} from '../models/Waitlist.js';

import { env } from '../config/env.js';
import {
  emitSeats,
  emitWaitlistOffer
} from './realtime.js';
import { sendEmail } from './email.js';

const expireAt = (minutes) =>
  new Date(Date.now() + minutes * 60_000);

const newId = () =>
  crypto.randomUUID();

const tokenHash = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

const asIds = (values) =>
  [...new Set(values || [])];


/* =========================================================
   SEAT HOLD
   ========================================================= */

export async function holdSeats({
  showId,
  userId,
  seatIds,
  minutes = env.holdMinutes
}) {
  seatIds = asIds(seatIds);

  if (!seatIds.length) {
    throw Object.assign(
      new Error('At least one seat is required.'),
      { status: 400 }
    );
  }

  const now = new Date();
  const holdId = newId();
  const until = expireAt(minutes);

  const show = await Show.findOneAndUpdate(
    {
      _id: showId,
      $expr: {
        $and: [
          {
            $eq: [
              {
                $size: {
                  $filter: {
                    input: '$seats',
                    as: 's',
                    cond: {
                      $in: ['$$s.seatId', seatIds]
                    }
                  }
                }
              },
              seatIds.length
            ]
          },
          {
            $eq: [
              {
                $size: {
                  $filter: {
                    input: '$seats',
                    as: 's',
                    cond: {
                      $and: [
                        {
                          $in: [
                            '$$s.seatId',
                            seatIds
                          ]
                        },
                        {
                          $or: [
                            {
                              $eq: [
                                '$$s.status',
                                'AVAILABLE'
                              ]
                            },
                            {
                              $and: [
                                {
                                  $eq: [
                                    '$$s.status',
                                    'HELD'
                                  ]
                                },
                                {
                                  $lte: [
                                    '$$s.holdExpiresAt',
                                    now
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              },
              seatIds.length
            ]
          }
        ]
      }
    },
    [
      {
        $set: {
          seats: {
            $map: {
              input: '$seats',
              as: 's',
              in: {
                $cond: [
                  {
                    $in: [
                      '$$s.seatId',
                      seatIds
                    ]
                  },
                  {
                    $mergeObjects: [
                      '$$s',
                      {
                        status: 'HELD',
                        holdId,
                        heldBy:
                          new mongoose.Types.ObjectId(userId),
                        holdExpiresAt: until
                      }
                    ]
                  },
                  '$$s'
                ]
              }
            }
          }
        }
      }
    ],
    {
      new: true
    }
  );

  if (!show) {
    throw Object.assign(
      new Error(
        'One or more seats are no longer available.'
      ),
      { status: 409 }
    );
  }

  emitSeats(show._id, show.seats);

  return {
    holdId,
    expiresAt: until,
    seats: show.seats
      .filter(s => seatIds.includes(s.seatId))
      .map(
        ({
          seatId,
          row,
          number,
          category,
          price,
          status,
          holdExpiresAt
        }) => ({
          seatId,
          row,
          number,
          category,
          price,
          status,
          holdExpiresAt
        })
      )
  };
}


/* =========================================================
   RELEASE EXPIRED NORMAL HOLDS
   ========================================================= */

export async function releaseExpiredHolds() {
  const now = new Date();

  const candidates = await Show.find({
    seats: {
      $elemMatch: {
        status: 'HELD',
        holdExpiresAt: {
          $lte: now
        }
      }
    }
  }).select('_id');

  for (const candidate of candidates) {
    const show = await Show.findOneAndUpdate(
      {
        _id: candidate._id,
        seats: {
          $elemMatch: {
            status: 'HELD',
            holdExpiresAt: {
              $lte: now
            },
            holdId: {
              $not: /^offer:/
            }
          }
        }
      },
      [
        {
          $set: {
            seats: {
              $map: {
                input: '$seats',
                as: 's',
                in: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            '$$s.status',
                            'HELD'
                          ]
                        },
                        {
                          $lte: [
                            '$$s.holdExpiresAt',
                            now
                          ]
                        },
                        {
                          $not: [
                            {
                              $regexMatch: {
                                input: {
                                  $ifNull: [
                                    '$$s.holdId',
                                    ''
                                  ]
                                },
                                regex: '^offer:'
                              }
                            }
                          ]
                        }
                      ]
                    },
                    {
                      $mergeObjects: [
                        '$$s',
                        {
                          status: 'AVAILABLE',
                          holdId: null,
                          heldBy: null,
                          holdExpiresAt: null
                        }
                      ]
                    },
                    '$$s'
                  ]
                }
              }
            }
          }
        }
      ],
      {
        new: true
      }
    );

    if (show) {
      emitSeats(show._id, show.seats);
    }
  }
}


/* =========================================================
   OPTIONAL TRANSACTION
   ========================================================= */

async function withOptionalTransaction(callback) {
  let session = null;

  try {
    session = await mongoose.startSession();
  } catch {
    return callback(null);
  }

  try {
    let result;

    try {
      await session.withTransaction(async () => {
        result = await callback(session);
      });

      return result;
    } catch (err) {
      const isReplicaSetError =
        err?.message?.includes('replica set') ||
        err?.message?.includes(
          'Transaction numbers'
        ) ||
        err?.code === 20 ||
        err?.codeName === 'IllegalOperation';

      if (isReplicaSetError) {
        return await callback(null);
      }

      throw err;
    }
  } finally {
    try {
      await session.endSession();
    } catch {}
  }
}


/* =========================================================
   CONFIRM BOOKING
   ========================================================= */

export async function confirmBooking({
  showId,
  userId,
  holdId
}) {
  const result = await withOptionalTransaction(
    async session => {
      const now = new Date();

      const offerId =
        holdId.startsWith('offer:')
          ? holdId.slice(6)
          : null;

      let acceptedOffer = null;

      /*
       * WAITLIST OFFER
       */
      if (offerId) {
        const offerQuery =
          WaitlistOffer.findOneAndUpdate(
            {
              _id: offerId,
              user: userId,
              status: 'ACTIVE',
              expiresAt: {
                $gt: now
              }
            },
            {
              $set: {
                status: 'ACCEPTED'
              }
            },
            {
              new: true
            }
          );

        if (session) {
          offerQuery.session(session);
        }

        acceptedOffer = await offerQuery;

        if (!acceptedOffer) {
          throw Object.assign(
            new Error(
              'This waitlist offer is invalid or expired.'
            ),
            { status: 409 }
          );
        }
      }

      /*
       * GET SHOW
       */
      const showQuery = Show.findOne({
        _id: showId
      });

      if (session) {
        showQuery.session(session);
      }

      const show = await showQuery;

      if (!show) {
        throw Object.assign(
          new Error('Show not found.'),
          { status: 404 }
        );
      }

      /*
       * VERIFY HOLD
       */
      const held = show.seats.filter(
        seat =>
          seat.holdId === holdId &&
          String(seat.heldBy) === String(userId)
      );

      if (
        !held.length ||
        held.some(
          seat =>
            seat.status !== 'HELD' ||
            seat.holdExpiresAt <= now
        )
      ) {
        throw Object.assign(
          new Error(
            'Your seat hold has expired.'
          ),
          { status: 409 }
        );
      }

      /*
       * VERIFY WAITLIST OFFER MATCH
       */
      if (
        acceptedOffer &&
        (
          acceptedOffer.show.toString() !==
            showId.toString() ||
          acceptedOffer.seatId !==
            held[0].seatId
        )
      ) {
        throw Object.assign(
          new Error(
            'Waitlist offer does not match this seat hold.'
          ),
          { status: 409 }
        );
      }

      /*
       * MARK SEATS AS BOOKED
       */
      show.seats.forEach(seat => {
        if (
          seat.holdId === holdId &&
          String(seat.heldBy) === String(userId)
        ) {
          Object.assign(seat, {
            status: 'BOOKED',
            holdId: undefined,
            heldBy: undefined,
            holdExpiresAt: undefined
          });
        }
      });

      /*
       * CREATE BOOKING REFERENCE
       */
      const reference =
        `BK-${crypto
          .randomBytes(5)
          .toString('hex')
          .toUpperCase()}`;

      /*
       * GENERATE QR CODE
       */
      const qrCode =
        await QRCode.toDataURL(
          JSON.stringify({
            bookingReference: reference
          })
        );

      /*
       * CREATE BOOKING
       */
      const booking =
        await Booking.create(
          [
            {
              reference,
              user: userId,
              show: showId,
              seats: held.map(seat => ({
                seatId: seat.seatId,
                category: seat.category,
                price: seat.price
              })),
              qrCode
            }
          ],
          session
            ? { session }
            : {}
        );

      /*
       * FULFILL WAITLIST ENTRY
       */
      if (acceptedOffer) {
        const entryUpdate =
          WaitlistEntry.updateOne(
            {
              _id: acceptedOffer.entry,
              status: 'OFFERED'
            },
            {
              $set: {
                status: 'FULFILLED'
              }
            }
          );

        if (session) {
          entryUpdate.session(session);
        }

        await entryUpdate;
      }

      /*
       * SAVE SHOW
       */
      await show.save(
        session
          ? { session }
          : {}
      );

      return {
        booking: booking[0],
        seats: show.seats
      };
    }
  );

  /*
   * UPDATE SEATS IMMEDIATELY
   */
  emitSeats(
    showId,
    result.seats
  );

  /*
   * SEND EMAIL IN BACKGROUND
   *
   * IMPORTANT:
   * Do not await this operation.
   *
   * Booking confirmation should not wait
   * for SMTP/Gmail.
   */
  sendBookingEmail(
    result.booking,
    userId
  ).catch(error => {
    console.error(
      'Background booking email failed:',
      error.message
    );
  });

  /*
   * RETURN BOOKING IMMEDIATELY
   */
  return result.booking;
}


/* =========================================================
   BACKGROUND BOOKING EMAIL
   ========================================================= */

async function sendBookingEmail(
  booking,
  userId
) {
  try {
    const user =
      await User.findById(userId);

    if (!user?.email) {
      throw new Error(
        'Customer email address not found.'
      );
    }

    const emailStatus =
      await sendEmail({
        to: user.email,

        subject:
          `Ticket ${booking.reference}`,

        text:
          `Your booking ${booking.reference} ` +
          `is confirmed. Seats: ` +
          `${booking.seats
            .map(seat => seat.seatId)
            .join(', ')}`,

        attachments: [
          {
            filename:
              `${booking.reference}.png`,

            content:
              booking.qrCode
                .split(',')[1],

            encoding: 'base64'
          }
        ]
      });

    await Booking.updateOne(
      {
        _id: booking._id
      },
      {
        $set: {
          emailStatus
        }
      }
    );

    console.log(
      `Booking email sent: ${booking.reference}`
    );
  } catch (error) {
    console.error(
      `Booking email failed for ${booking.reference}:`,
      error.message
    );

    await Booking.updateOne(
      {
        _id: booking._id
      },
      {
        $set: {
          emailStatus: 'FAILED'
        }
      }
    );
  }
}


/* =========================================================
   JOIN WAITLIST
   ========================================================= */

export async function joinWaitlist({
  showId,
  userId,
  category
}) {
  const show =
    await Show.findById(showId)
      .select('seats');

  if (!show) {
    throw Object.assign(
      new Error('Show not found.'),
      { status: 404 }
    );
  }

  if (
    !show.seats.some(
      seat => seat.category === category
    )
  ) {
    throw Object.assign(
      new Error(
        'Seat category not found for this show.'
      ),
      { status: 400 }
    );
  }

  try {
    return await WaitlistEntry.create({
      show: showId,
      user: userId,
      category
    });
  } catch (e) {
    if (e.code === 11000) {
      throw Object.assign(
        new Error(
          'You are already on this waitlist.'
        ),
        { status: 409 }
      );
    }

    throw e;
  }
}


/* =========================================================
   ACCEPT WAITLIST OFFER
   ========================================================= */

export async function acceptOffer({
  token,
  userId
}) {
  const offer =
    await WaitlistOffer.findOne({
      tokenHash: tokenHash(token),
      user: userId,
      status: 'ACTIVE',
      expiresAt: {
        $gt: new Date()
      }
    });

  if (!offer) {
    throw Object.assign(
      new Error(
        'This waitlist offer is invalid or expired.'
      ),
      { status: 409 }
    );
  }

  return confirmBooking({
    showId: offer.show,
    userId,
    holdId: `offer:${offer._id}`
  });
}


/* =========================================================
   OFFER NEXT WAITLISTED CUSTOMER
   ========================================================= */

export async function offerNextWaitlisted(
  showId,
  seatId,
  category
) {
  const offerResult =
    await withOptionalTransaction(
      async session => {
        const entryQuery =
          WaitlistEntry.findOneAndUpdate(
            {
              show: showId,
              category,
              status: 'WAITING'
            },
            {
              $set: {
                status: 'OFFERED'
              }
            },
            {
              sort: {
                createdAt: 1
              },
              new: true
            }
          );

        if (session) {
          entryQuery.session(session);
        }

        const entry =
          await entryQuery;

        if (!entry) {
          return null;
        }

        const token =
          crypto.randomBytes(32).toString('hex');

        const offer =
          await WaitlistOffer.create(
            [
              {
                show: showId,
                entry: entry._id,
                user: entry.user,
                seatId,
                tokenHash:
                  tokenHash(token),
                expiresAt:
                  expireAt(
                    env.offerMinutes
                  )
              }
            ],
            session
              ? { session }
              : {}
          );

        const showQuery =
          Show.findOneAndUpdate(
            {
              _id: showId,
              seats: {
                $elemMatch: {
                  seatId,
                  status: 'AVAILABLE'
                }
              }
            },
            {
              $set: {
                'seats.$.status':
                  'HELD',
                'seats.$.holdId':
                  `offer:${offer[0]._id}`,
                'seats.$.heldBy':
                  entry.user,
                'seats.$.holdExpiresAt':
                  offer[0].expiresAt
              }
            },
            {
              new: true
            }
          );

        if (session) {
          showQuery.session(session);
        }

        const show =
          await showQuery;

        if (!show) {
          const cancelOffer =
            WaitlistOffer.updateOne(
              {
                _id: offer[0]._id
              },
              {
                $set: {
                  status: 'CANCELLED'
                }
              }
            );

          const resetEntry =
            WaitlistEntry.updateOne(
              {
                _id: entry._id
              },
              {
                $set: {
                  status: 'WAITING'
                }
              }
            );

          if (session) {
            cancelOffer.session(session);
            resetEntry.session(session);
          }

          await cancelOffer;
          await resetEntry;

          return null;
        }

        return {
          offer: offer[0],
          token,
          userId: entry.user,
          seats: show.seats
        };
      }
    );

  /*
   * IMPORTANT:
   * Print the generated offer URL so we can test it
   * even when email delivery is not configured.
   */

  if (offerResult) {
  const user =
    await User.findById(
      offerResult.userId
    );

  // Notify the specific waitlisted user in real time
  emitWaitlistOffer(
    offerResult.userId,
    {
      showId: String(showId),
      seatId,
      category,
      expiresAt: offerResult.offer.expiresAt,
      offerToken: offerResult.token
    }
  );

  

    const offerUrl =
      `${env.clientUrl}/waitlist/offer/${offerResult.token}`;

    console.log(
      '===================================='
    );
    console.log(
      'WAITLIST OFFER CREATED'
    );
    console.log(
      'User:',
      user?.email
    );
    console.log(
      'Seat:',
      seatId
    );
    console.log(
      'Category:',
      category
    );
    console.log(
      'Expires:',
      offerResult.offer.expiresAt.toISOString()
    );
    console.log(
      'ACCEPT OFFER URL:',
      offerUrl
    );
    console.log(
      '===================================='
    );

    try {
      await sendEmail({
        to: user?.email,
        subject:
          'Your waitlist offer',
        text:
          `Seat ${seatId} is reserved until ` +
          `${offerResult.offer.expiresAt.toISOString()}. ` +
          `Accept at ${offerUrl}`
      });
    } catch (error) {
      console.error(
        'Waitlist email failed:',
        error.message
      );
    }

    emitSeats(
      showId,
      offerResult.seats
    );
  }

  return offerResult?.offer;
}


/* =========================================================
   EXPIRE WAITLIST OFFERS
   ========================================================= */

export async function expireOffers() {
  const expired =
    await WaitlistOffer.find({
      status: 'ACTIVE',
      expiresAt: {
        $lte: new Date()
      }
    }).select('_id');

  for (const item of expired) {
    let releasedSeatId = null;

    const released =
      await withOptionalTransaction(
        async session => {
          const now = new Date();

          const claimQuery =
            WaitlistOffer.findOneAndUpdate(
              {
                _id: item._id,
                status: 'ACTIVE',
                expiresAt: {
                  $lte: now
                }
              },
              {
                $set: {
                  status: 'EXPIRED'
                }
              },
              {
                new: true
              }
            );

          if (session) {
            claimQuery.session(session);
          }

          const claimed =
            await claimQuery;

          if (!claimed) {
            return null;
          }

          const resetEntry =
            WaitlistEntry.updateOne(
              {
                _id: claimed.entry,
                status: {
                  $in: [
                    'WAITING',
                    'OFFERED'
                  ]
                }
              },
              {
                $set: {
                  status: 'WAITING'
                }
              }
            );

          if (session) {
            resetEntry.session(session);
          }

          await resetEntry;

          const showQuery =
            Show.findOne({
              _id: claimed.show
            });

          if (session) {
            showQuery.session(session);
          }

          const show =
            await showQuery;

          const seat =
            show?.seats.find(
              s =>
                s.seatId ===
                  claimed.seatId &&
                s.holdId ===
                  `offer:${claimed._id}`
            );

          if (!seat) {
            return null;
          }

          releasedSeatId =
            seat.seatId;

          Object.assign(
            seat,
            {
              status: 'AVAILABLE',
              holdId: undefined,
              heldBy: undefined,
              holdExpiresAt: undefined
            }
          );

          await show.save(
            session
              ? { session }
              : {}
          );

          return show;
        }
      );

    if (released) {
      emitSeats(
        released._id,
        released.seats
      );

      const seat =
        released.seats.find(
          s =>
            s.seatId ===
            releasedSeatId
        );

      if (seat) {
        await offerNextWaitlisted(
          released._id,
          releasedSeatId,
          seat.category
        );
      }
    }
  }
}


/* =========================================================
   CANCEL BOOKING
   ========================================================= */

export async function cancelBooking({
  bookingId,
  userId
}) {
  let freed = [];

  const result =
    await withOptionalTransaction(
      async session => {
        const bookingQuery =
          Booking.findOne({
            _id: bookingId,
            user: userId,
            status: 'CONFIRMED'
          });

        if (session) {
          bookingQuery.session(session);
        }

        const booking =
          await bookingQuery;

        if (!booking) {
          throw Object.assign(
            new Error(
              'Booking not found.'
            ),
            { status: 404 }
          );
        }

        const showQuery =
          Show.findById(
            booking.show
          );

        if (session) {
          showQuery.session(session);
        }

        const show =
          await showQuery;

        if (!show) {
          throw Object.assign(
            new Error(
              'Show not found.'
            ),
            { status: 404 }
          );
        }

        freed = booking.seats;

        show.seats.forEach(s => {
          if (
            freed.some(
              x =>
                x.seatId ===
                s.seatId
            )
          ) {
            Object.assign(
              s,
              {
                status: 'AVAILABLE',
                holdId: undefined,
                heldBy: undefined,
                holdExpiresAt: undefined
              }
            );
          }
        });

        booking.status =
          'CANCELLED';

        await booking.save(
          session
            ? { session }
            : {}
        );

        await show.save(
          session
            ? { session }
            : {}
        );

        return {
          show,
          seats: show.seats
        };
      }
    );

  emitSeats(
    result.show._id,
    result.seats
  );

  for (const seat of freed) {
    await offerNextWaitlisted(
      result.show._id,
      seat.seatId,
      seat.category
    );
  }

  return result;
}