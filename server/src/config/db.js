import mongoose from 'mongoose';
export const connectDb = (uri) => mongoose.connect(uri);
