import { releaseExpiredHolds,expireOffers } from '../services/bookingService.js';
export const startJobs=()=>setInterval(()=>Promise.all([releaseExpiredHolds(),expireOffers()]).catch(console.error),30_000).unref();
