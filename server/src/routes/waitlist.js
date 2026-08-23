import { Router } from 'express'; import { z } from 'zod'; import { authenticate,allowRoles } from '../middleware/auth.js'; import { joinWaitlist,acceptOffer } from '../services/bookingService.js';
const router=Router(); router.use(authenticate,allowRoles('CUSTOMER'));
router.post('/shows/:showId',async(req,res,next)=>{try{const {category}=z.object({category:z.string().min(1)}).parse(req.body);res.status(201).json({entry:await joinWaitlist({showId:req.params.showId,userId:req.user.id,category})});}catch(e){next(e);}});
router.post('/offers/:token/accept',async(req,res,next)=>{try{res.status(201).json({booking:await acceptOffer({token:req.params.token,userId:req.user.id})});}catch(e){next(e);}});
export default router;
