import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['CUSTOMER', 'ORGANISER', 'ADMIN'],
      default: 'CUSTOMER'
    },

    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

schema.methods.verifyPassword = function (password) {
  return bcrypt.compare(
    password,
    this.passwordHash
  );
};

export const User =
  mongoose.model('User', schema);