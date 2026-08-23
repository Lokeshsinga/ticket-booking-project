import jwt from 'jsonwebtoken'; import { env } from '../config/env.js';
export function authenticate(req,res,next) { try { const token=req.headers.authorization?.replace(/^Bearer\s+/,''); if(!token) throw Error(); req.user=jwt.verify(token,env.jwtSecret); next(); } catch { res.status(401).json({error:'Authentication required.'}); } }
export const allowRoles=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Insufficient permissions.'});
