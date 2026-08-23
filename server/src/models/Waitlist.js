import mongoose from 'mongoose';
const entrySchema = new mongoose.Schema({show:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},user:{type:mongoose.Schema.Types.ObjectId,required:true},category:{type:String,required:true},status:{type:String,enum:['WAITING','OFFERED','FULFILLED','CANCELLED'],default:'WAITING'}},{timestamps:true});
entrySchema.index({show:1,category:1,createdAt:1});
entrySchema.index({show:1,user:1,category:1},{unique:true});
const offerSchema = new mongoose.Schema({show:{type:mongoose.Schema.Types.ObjectId,required:true},entry:{type:mongoose.Schema.Types.ObjectId,required:true},user:{type:mongoose.Schema.Types.ObjectId,required:true},seatId:{type:String,required:true},tokenHash:{type:String,required:true,unique:true},status:{type:String,enum:['ACTIVE','ACCEPTED','EXPIRED','CANCELLED'],default:'ACTIVE'},expiresAt:{type:Date,required:true}},{timestamps:true});
offerSchema.index({status:1,expiresAt:1});
offerSchema.index({entry:1,status:1},{unique:true,partialFilterExpression:{status:'ACTIVE'}});
export const WaitlistEntry=mongoose.model('WaitlistEntry',entrySchema);
export const WaitlistOffer=mongoose.model('WaitlistOffer',offerSchema);
