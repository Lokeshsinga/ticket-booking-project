import mongoose from 'mongoose';
export const Event = mongoose.model('Event', new mongoose.Schema({ title:{type:String,required:true}, type:{type:String,enum:['MOVIE','CONCERT'],required:true}, description:String, organiser:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true} },{timestamps:true}));
