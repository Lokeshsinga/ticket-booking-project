export default function SeatMap({seats,onSelect,selected=[]}){return <div className="seat-map">{seats.map(s=><button key={s.seatId} disabled={s.status!=='AVAILABLE'} className={`seat ${s.status.toLowerCase()} ${selected.includes(s.seatId)?'selected':''}`} onClick={()=>onSelect(s.seatId)} title={`${s.category} · ₹${s.price}`}>{s.seatId}</button>)}</div>}
import React from 'react';
