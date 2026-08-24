import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';

import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';

const router = Router();

const registration = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPassword = z.object({
  email: z.string().email()
});

const resetPassword = z.object({
  password: z.string().min(8)
});

const issue = (u) =>
  jwt.sign(
    {
      id: u._id,
      role: u.role
    },
    env.jwtSecret,
    {
      expiresIn: '7d'
    }
  );

const dto = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role
});


/* =========================================================
   REGISTER
   ========================================================= */

router.post(
  '/register',
  async (req, res, next) => {
    try {
      const input =
        registration.parse(req.body);

      const user =
        await User.create({
          ...input,
          email:
            input.email.toLowerCase(),
          passwordHash:
            await bcrypt.hash(
              input.password,
              12
            )
        });

      res.status(201).json({
        token: issue(user),
        user: dto(user)
      });
    } catch (e) {
      if (e.code === 11000) {
        e.status = 409;
        e.message =
          'Email is already registered.';
      }

      next(e);
    }
  }
);


/* =========================================================
   LOGIN
   ========================================================= */

router.post(
  '/login',
  async (req, res, next) => {
    try {
      const input =
        login.parse(req.body);

      const user =
        await User.findOne({
          email:
            input.email.toLowerCase()
        });

      if (
        !user ||
        !(await user.verifyPassword(
          input.password
        ))
      ) {
        return res.status(401).json({
          error:
            'Invalid email or password.'
        });
      }

      res.json({
        token: issue(user),
        user: dto(user)
      });
    } catch (e) {
      next(e);
    }
  }
);


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

router.post(
  '/forgot-password',
  async (req, res, next) => {
    try {
      const { email } =
        forgotPassword.parse(
          req.body
        );

      const user =
        await User.findOne({
          email:
            email.toLowerCase()
        });

      /*
       * Always return the same message,
       * even if the email doesn't exist.
       * This prevents account enumeration.
       */

      if (!user) {
        return res.json({
          message:
            'If an account exists with that email, a password reset link has been sent.'
        });
      }

      /*
       * Generate a random token.
       * Only the hash is stored in MongoDB.
       */

      const token =
        crypto
          .randomBytes(32)
          .toString('hex');

      const tokenHash =
        crypto
          .createHash('sha256')
          .update(token)
          .digest('hex');

      user.resetPasswordToken =
        tokenHash;

      /*
       * Reset link expires after 15 minutes.
       */

      user.resetPasswordExpires =
        new Date(
          Date.now() + 15 * 60 * 1000
        );

      await user.save();

      /*
       * IMPORTANT:
       * This must be your Vercel frontend URL.
       */

      const resetUrl =
        `${env.clientUrl}/reset-password/${token}`;

      await sendEmail({
        to: user.email,
        subject:
          'Ticketly Password Reset',
        text:
          `You requested a password reset for your Ticketly account.\n\n` +
          `Reset your password using this link:\n\n` +
          `${resetUrl}\n\n` +
          `This link expires in 15 minutes.\n\n` +
          `If you did not request this, you can safely ignore this email.`
      });

      res.json({
        message:
          'If an account exists with that email, a password reset link has been sent.'
      });
    } catch (e) {
      next(e);
    }
  }
);


/* =========================================================
   RESET PASSWORD
   ========================================================= */

router.post(
  '/reset-password/:token',
  async (req, res, next) => {
    try {
      const { password } =
        resetPassword.parse(
          req.body
        );

      const tokenHash =
        crypto
          .createHash('sha256')
          .update(req.params.token)
          .digest('hex');

      const user =
        await User.findOne({
          resetPasswordToken:
            tokenHash,
          resetPasswordExpires: {
            $gt: new Date()
          }
        });

      if (!user) {
        return res.status(400).json({
          error:
            'Password reset link is invalid or expired.'
        });
      }

      user.passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      /*
       * Make the reset token unusable
       * after successful password change.
       */

      user.resetPasswordToken =
        null;

      user.resetPasswordExpires =
        null;

      await user.save();

      res.json({
        message:
          'Password reset successfully. You can now log in with your new password.'
      });
    } catch (e) {
      next(e);
    }
  }
);


/* =========================================================
   CURRENT USER
   ========================================================= */

router.get(
  '/me',
  authenticate,
  async (req, res, next) => {
    try {
      const user =
        await User.findById(
          req.user.id
        );

      res.json({
        user: dto(user)
      });
    } catch (e) {
      next(e);
    }
  }
);


export default router;