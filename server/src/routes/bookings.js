import { Router } from 'express'; import { z } from 'zod'; import { authenticate,allowRoles } from '../middleware/auth.js'; import { Booking } from '../models/Booking.js'; import { confirmBooking,cancelBooking } from '../services/bookingService.js';
const router=Router(); const body=z.object({showId:z.string(),holdId:z.string().min(1)}); router.use(authenticate,allowRoles('CUSTOMER'));
router.post('/',async(req,res,next)=>{try{const x=body.parse(req.body);res.status(201).json({booking:await confirmBooking({...x,userId:req.user.id})});}catch(e){next(e);}});
router.get('/',async(req,res,next)=>{try{res.json({bookings:await Booking.find({user:req.user.id}).sort({createdAt:-1}).populate({path:'show',populate:'event venue'})});}catch(e){next(e);}});
router.post('/:id/cancel',async(req,res,next)=>{try{await cancelBooking({bookingId:req.params.id,userId:req.user.id});res.status(204).end();}catch(e){next(e);}}); export default router;
