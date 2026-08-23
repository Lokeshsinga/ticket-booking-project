import bcrypt from 'bcrypt';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Venue } from './models/Venue.js';
import { Event } from './models/Event.js';
import { Show } from './models/Show.js';

await connectDb(env.mongoUri);
const passwordHash = await bcrypt.hash('Password123!', 12);
const users = {};
for (const [email, role, name] of [['customer@example.com','CUSTOMER','Demo Customer'],['organiser@example.com','ORGANISER','Demo Organiser'],['admin@example.com','ADMIN','Demo Admin']]) {
  users[role] = await User.findOneAndUpdate({email},{name,email,passwordHash,role},{upsert:true,new:true,setDefaultsOnInsert:true});
}
const seats = ['A','B','C','D'].flatMap((row) => Array.from({length:5},(_,index) => ({seatId:`${row}${index+1}`,row,number:String(index+1),category:row==='A'?'Premium':'Standard'})));
const venue = await Venue.findOneAndUpdate({name:'Unthinkable Arena'},{$set:{name:'Unthinkable Arena',address:'1 Example Street',seats}},{upsert:true,new:true,setDefaultsOnInsert:true});
for (const [title,type] of [['Midnight Cinema','MOVIE'],['Live at the Arena','CONCERT']]) {
  const event = await Event.findOneAndUpdate({title},{title,type,description:`A demo ${type.toLowerCase()} experience.`,organiser:users.ORGANISER._id},{upsert:true,new:true,setDefaultsOnInsert:true});
  await Show.findOneAndUpdate({event:event._id,venue:venue._id},{$setOnInsert:{event:event._id,venue:venue._id,startsAt:new Date(Date.now()+86400000),seats:seats.map(seat=>({...seat,price:seat.category==='Premium'?45:25}))}},{upsert:true,new:true,setDefaultsOnInsert:true});
}
console.log('Seeded demo users: customer@example.com, organiser@example.com, admin@example.com; password: Password123!');
await User.db.close();