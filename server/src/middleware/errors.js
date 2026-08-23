export function notFound(req,res){res.status(404).json({error:'Route not found.'});}
export function errors(err,req,res,_next){console.error(err); if(err.name==='ZodError'||err.name==='CastError') return res.status(400).json({error:'Invalid request.'}); res.status(err.status||500).json({error:err.message||'Internal server error.'});}
