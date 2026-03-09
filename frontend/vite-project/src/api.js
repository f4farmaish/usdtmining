const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function r(path, opts={}, token=null) {
  const h = { "Content-Type":"application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers:{ ...h, ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  register:   b       => r("/api/auth/register",{method:"POST",body:JSON.stringify(b)}),
  login:      b       => r("/api/auth/login",{method:"POST",body:JSON.stringify(b)}),
  me:         t       => r("/api/auth/me",{},t),
  readNotes:  t       => r("/api/auth/notifications/read",{method:"POST"},t),

  deposit:    (b,t)   => r("/api/deposits",{method:"POST",body:JSON.stringify(b)},t),
  getDeposits:t       => r("/api/deposits",{},t),

  withdraw:   (b,t)   => r("/api/withdrawals",{method:"POST",body:JSON.stringify(b)},t),
  getWithdrawals: t   => r("/api/withdrawals",{},t),

  getReferrals: t     => r("/api/referrals",{},t),
  getPlans:     ()    => r("/api/plans"),

  // Admin - uses x-admin-key header
  aStats:     k       => r("/api/admin/stats",{headers:{"x-admin-key":k}}),
  aDeposits:  (k,s)   => r(`/api/admin/deposits?status=${s||"pending"}`,{headers:{"x-admin-key":k}}),
  aApprove:   (k,id)  => r(`/api/admin/deposits/${id}/approve`,{method:"POST",headers:{"x-admin-key":k}}),
  aReject:    (k,id,note) => r(`/api/admin/deposits/${id}/reject`,{method:"POST",body:JSON.stringify({note}),headers:{"x-admin-key":k}}),
  aWithdrawals:(k,s)  => r(`/api/admin/withdrawals?status=${s||"pending"}`,{headers:{"x-admin-key":k}}),
  aCompleteW: (k,id,tx)   => r(`/api/admin/withdrawals/${id}/complete`,{method:"POST",body:JSON.stringify({txHash:tx}),headers:{"x-admin-key":k}}),
  aRejectW:   (k,id,note) => r(`/api/admin/withdrawals/${id}/reject`,{method:"POST",body:JSON.stringify({note}),headers:{"x-admin-key":k}}),
  aUsers:     (k,s)   => r(`/api/admin/users?search=${s||""}`,{headers:{"x-admin-key":k}}),
  aBlock:     (k,id)  => r(`/api/admin/users/${id}/block`,{method:"POST",headers:{"x-admin-key":k}}),
  aAdjustBal: (k,id,amount) => r(`/api/admin/users/${id}/adjust-balance`,{method:"POST",body:JSON.stringify({amount}),headers:{"x-admin-key":k}}),
  aSetPlan:   (k,id,planId) => r(`/api/admin/users/${id}/set-plan`,{method:"POST",body:JSON.stringify({planId}),headers:{"x-admin-key":k}}),
  aRemovePlan:(k,id)  => r(`/api/admin/users/${id}/remove-plan`,{method:"POST",headers:{"x-admin-key":k}}),
};

export const PLANS = [
  { id:1, name:"Starter",  price:15,   daily:2,   minW:4,   days:30, icon:"🌱", color:"#a78bfa", grad:"135deg,#7c3aed,#a78bfa" },
  { id:2, name:"Basic",    price:25,   daily:5,   minW:8,   days:30, icon:"⚡", color:"#60a5fa", grad:"135deg,#2563eb,#60a5fa" },
  { id:3, name:"Bronze",   price:50,   daily:10,  minW:15,  days:30, icon:"🥉", color:"#fb923c", grad:"135deg,#c2410c,#fb923c" },
  { id:4, name:"Silver",   price:100,  daily:22,  minW:30,  days:30, icon:"🥈", color:"#94a3b8", grad:"135deg,#475569,#94a3b8" },
  { id:5, name:"Gold",     price:250,  daily:60,  minW:80,  days:30, icon:"🥇", color:"#fbbf24", grad:"135deg,#b45309,#fbbf24" },
  { id:6, name:"Platinum", price:500,  daily:130, minW:150, days:30, icon:"💎", color:"#e2e8f0", grad:"135deg,#64748b,#cbd5e1" },
  { id:7, name:"Diamond",  price:1000, daily:280, minW:300, days:30, icon:"👑", color:"#67e8f9", grad:"135deg,#0891b2,#67e8f9" },
];

export const DEPOSIT_ADDRESS = import.meta.env.VITE_DEPOSIT_ADDRESS || "TTGZnhafw44MWzKBTgmHWLeVFZuQHTxaeH";
export const ADMIN_KEY_STORED = import.meta.env.VITE_ADMIN_KEY || "";
export const fmt  = n => Number(n||0).toFixed(2);
export const fmt4 = n => Number(n||0).toFixed(4);
export const timeAgo = d => {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if(s<60) return s+"s ago";
  if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
};
