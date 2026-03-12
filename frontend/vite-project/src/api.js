const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function r(path, opts={}, token=null, adminKey=null) {
  const h = { "Content-Type":"application/json" };
  if (token)    h["Authorization"] = `Bearer ${token}`;
  if (adminKey) h["x-admin-key"]   = adminKey;
  const res  = await fetch(`${BASE}${path}`, { ...opts, headers:{ ...h, ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Auth
  register:   b       => r("/api/auth/register",  { method:"POST", body:JSON.stringify(b) }),
  login:      b       => r("/api/auth/login",     { method:"POST", body:JSON.stringify(b) }),
  me:         t       => r("/api/auth/me",         {}, t),
  readNotes:  t       => r("/api/auth/notifications/read", { method:"POST" }, t),

  // Deposits
  deposit:        (b,t)  => r("/api/deposits",   { method:"POST", body:JSON.stringify(b) }, t),
  getDeposits:    t      => r("/api/deposits",    {}, t),
  getAddresses:   ()     => r("/api/deposit-addresses"),

  // Withdrawals
  withdraw:       (b,t)  => r("/api/withdrawals", { method:"POST", body:JSON.stringify(b) }, t),
  getWithdrawals: t      => r("/api/withdrawals",  {}, t),

  // Referrals & plans
  getReferrals:   t      => r("/api/referrals",   {}, t),
  getPlans:       ()     => r("/api/plans"),

  // Announcements
  getAnnouncements: ()   => r("/api/announcements"),
  markAnnRead: (id,t)    => r(`/api/announcements/${id}/read`, { method:"POST" }, t),

  // Chat
  sendChat:      (b,t)   => r("/api/chat",        { method:"POST", body:JSON.stringify(b) }, t),
  getChat:       t       => r("/api/chat",         {}, t),
  getChatUnread: t       => r("/api/chat/unread",  {}, t),

  // Admin — stats
  aStats:     k          => r("/api/admin/stats",  {}, null, k),

  // Admin — deposits
  aDeposits:  (k,s)      => r(`/api/admin/deposits?status=${s||"pending"}`,        {}, null, k),
  aApprove:   (k,id)     => r(`/api/admin/deposits/${id}/approve`,  { method:"POST" }, null, k),
  aReject:    (k,id,note)=> r(`/api/admin/deposits/${id}/reject`,   { method:"POST", body:JSON.stringify({note}) }, null, k),

  // Admin — withdrawals
  aWithdrawals:(k,s)     => r(`/api/admin/withdrawals?status=${s||"pending"}`,     {}, null, k),
  aCompleteW: (k,id,tx)  => r(`/api/admin/withdrawals/${id}/complete`, { method:"POST", body:JSON.stringify({txHash:tx}) }, null, k),
  aRejectW:   (k,id,note)=> r(`/api/admin/withdrawals/${id}/reject`,   { method:"POST", body:JSON.stringify({note}) }, null, k),

  // Admin — users
  aUsers:     (k,s)      => r(`/api/admin/users?search=${s||""}`,   {}, null, k),
  aBlock:     (k,id)     => r(`/api/admin/users/${id}/block`,       { method:"POST" }, null, k),
  aAdjustBal: (k,id,a)   => r(`/api/admin/users/${id}/adjust-balance`, { method:"POST", body:JSON.stringify({amount:a}) }, null, k),
  aSendMoney: (k,id,a,n) => r(`/api/admin/users/${id}/send-money`,  { method:"POST", body:JSON.stringify({amount:a,note:n}) }, null, k),
  aSetPlan:   (k,id,p)   => r(`/api/admin/users/${id}/set-plan`,    { method:"POST", body:JSON.stringify({planId:p}) }, null, k),
  aRemovePlan:(k,id)     => r(`/api/admin/users/${id}/remove-plan`, { method:"POST" }, null, k),
  aNotifyUser:(k,id,m,t) => r(`/api/admin/users/${id}/notify`,      { method:"POST", body:JSON.stringify({message:m,type:t}) }, null, k),
  aNotifyAll: (k,m,t)    => r("/api/admin/notify-all",              { method:"POST", body:JSON.stringify({message:m,type:t}) }, null, k),

  // Admin — chat
  aChatThreads: k          => r("/api/admin/chat/threads",       {}, null, k),
  aChatUser:    (k,uid)    => r(`/api/admin/chat/${uid}`,        {}, null, k),
  aChatReply:   (k,uid,m)  => r(`/api/admin/chat/${uid}/reply`,  { method:"POST", body:JSON.stringify({message:m}) }, null, k),

  // Admin — announcements
  aAnnouncements:      k         => r("/api/admin/announcements",        {}, null, k),
  aAddAnnouncement:    (k,b)     => r("/api/admin/announcements",        { method:"POST",   body:JSON.stringify(b) }, null, k),
  aToggleAnnouncement: (k,id,b)  => r(`/api/admin/announcements/${id}`,  { method:"PATCH",  body:JSON.stringify(b) }, null, k),
  aDeleteAnnouncement: (k,id)    => r(`/api/admin/announcements/${id}`,  { method:"DELETE" }, null, k),
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

export const COINS = [
  { id:"USDT", label:"USDT TRC-20", icon:"💵", color:"#26a17b" },
  { id:"TRX",  label:"TRX",         icon:"🔵", color:"#ef4444" },
  { id:"BTC",  label:"Bitcoin",     icon:"₿",  color:"#f7931a" },
  { id:"ETH",  label:"Ethereum",    icon:"⟠",  color:"#627eea" },
  { id:"DOGE", label:"Dogecoin",    icon:"🐕", color:"#c2a633" },
];

export const DEPOSIT_BONUS_TIERS = [
  { min:15,  max:50,   pct:20, label:"20% BONUS" },
  { min:100, max:1000, pct:35, label:"35% BONUS" },
];

export const getBonusPct = price => {
  for (const t of DEPOSIT_BONUS_TIERS) if (price >= t.min && price <= t.max) return t.pct;
  return 0;
};

export const DEPOSIT_ADDRESSES = {
  USDT: "TTGZnhafw44MWzKBTgmHWLeVFZuQHTxaeH",
  TRX:  "TTGZnhafw44MWzKBTgmHWLeVFZuQHTxaeH",
  BTC:  "YOUR_BTC_ADDRESS",
  ETH:  "YOUR_ETH_ADDRESS",
  DOGE: "YOUR_DOGE_ADDRESS"
};
export const fmt  = n => Number(n||0).toFixed(2);
export const fmt4 = n => Number(n||0).toFixed(4);
export const timeAgo = d => {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s < 60)    return s+"s ago";
  if (s < 3600)  return Math.floor(s/60)+"m ago";
  if (s < 86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
};
