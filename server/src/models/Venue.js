import mongoose from 'mongoose';
export const Venue = mongoose.model('Venue', new mongoose.Schema({ name:{type:String,required:true}, address:String, seats:[{seatId:{type:String,required:true}, row:String, number:String, category:{type:String,required:true}}] },{timestamps:true}));
