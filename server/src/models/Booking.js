import mongoose from 'mongoose';
const schema = new mongoose.Schema({ reference:{type:String,required:true,unique:true,index:true}, user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, show:{type:mongoose.Schema.Types.ObjectId,ref:'Show',required:true,index:true}, seats:[{seatId:String,category:String,price:Number}], status:{type:String,enum:['CONFIRMED','CANCELLED'],default:'CONFIRMED'}, qrCode:String, emailStatus:{type:String,enum:['PENDING','SENT','FAILED','CONSOLE'],default:'PENDING'} },{timestamps:true});
schema.index({show:1,user:1});
export const Booking=mongoose.model('Booking',schema);
