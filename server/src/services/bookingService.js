export async function offerNextWaitlisted(showId, seatId, category) {
  const offerResult = await withOptionalTransaction(async (session) => {
    const entryQuery = WaitlistEntry.findOneAndUpdate(
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

    if (session) entryQuery.session(session);

    const entry = await entryQuery;

    if (!entry) return null;

    const token = crypto.randomBytes(32).toString('hex');

    const offer = await WaitlistOffer.create(
      [
        {
          show: showId,
          entry: entry._id,
          user: entry.user,
          seatId,
          tokenHash: tokenHash(token),
          expiresAt: expireAt(env.offerMinutes)
        }
      ],
      session ? { session } : {}
    );

    const showQuery = Show.findOneAndUpdate(
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
          'seats.$.status': 'HELD',
          'seats.$.holdId': `offer:${offer[0]._id}`,
          'seats.$.heldBy': entry.user,
          'seats.$.holdExpiresAt': offer[0].expiresAt
        }
      },
      {
        new: true
      }
    );

    if (session) showQuery.session(session);

    const show = await showQuery;

    if (!show) {
      const cancelOffer = WaitlistOffer.updateOne(
        {
          _id: offer[0]._id
        },
        {
          $set: {
            status: 'CANCELLED'
          }
        }
      );

      const resetEntry = WaitlistEntry.updateOne(
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
  });

  // NEW: Show the waitlist offer URL in Render logs
  if (offerResult) {
    const user = await User.findById(offerResult.userId);

    const offerUrl =
      `${env.clientUrl}/waitlist/offer/${offerResult.token}`;

    console.log('====================================');
    console.log('WAITLIST OFFER CREATED');
    console.log('User:', user?.email);
    console.log('Seat:', seatId);
    console.log('Category:', category);
    console.log(
      'Expires:',
      offerResult.offer.expiresAt.toISOString()
    );
    console.log('ACCEPT OFFER URL:', offerUrl);
    console.log('====================================');

    try {
      await sendEmail({
        to: user?.email,
        subject: 'Your waitlist offer',
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

    emitSeats(showId, offerResult.seats);
  }

  return offerResult?.offer;
}