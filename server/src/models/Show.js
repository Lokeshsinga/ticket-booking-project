import mongoose from 'mongoose';
const seatSchema = new mongoose.Schema({ seatId:{type:String,required:true}, row:String, number:String, category:{type:String,required:true}, price:{type:Number,required:true}, status:{type:String,enum:['AVAILABLE','HELD','BOOKED'],default:'AVAILABLE'}, holdId:String, heldBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, holdExpiresAt:Date },{_id:false});
const schema = new mongoose.Schema({ event:{type:mongoose.Schema.Types.ObjectId,ref:'Event',required:true}, venue:{type:mongoose.Schema.Types.ObjectId,ref:'Venue',required:true}, startsAt:{type:Date,required:true}, seats:[seatSchema] },{timestamps:true});
schema.index({ 'seats.seatId': 1 });
schema.index({ 'seats.status': 1, 'seats.holdExpiresAt': 1 });
export const Show = mongoose.model('Show', schema);
