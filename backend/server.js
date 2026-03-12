require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const cors     = require("cors");
const { User, Deposit, Withdrawal, Chat, Announcement, PLANS, DEPOSIT_BONUSES, DEPOSIT_ADDRESSES } = require("./model");

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "https://usdt-rain.netlify.app",
    "https://usdtmining-self.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
  ],
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-admin-key","X-Admin-Key"],
  credentials: true,
}));

app.use(express.json({ limit:"10mb" }));

// ── MongoDB ───────────────────────────────────────────────────
let cachedConn = null;
const connectDB = async () => {
  if (cachedConn && mongoose.connection.readyState === 1) return cachedConn;
  cachedConn = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
  });
  console.log("✅ MongoDB connected");
  return cachedConn;
};
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (e) { res.status(500).json({ error:"DB connection failed: " + e.message }); }
});

// ── Auth middleware ───────────────────────────────────────────
const auth = (req, res, next) => {
  const t = req.headers.authorization?.split(" ")[1];
  if (!t) return res.status(401).json({ error:"No token" });
  try { req.user = jwt.verify(t, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error:"Invalid token" }); }
};

const adminAuth = (req, res, next) => {
  const k = req.headers["x-admin-key"] || req.headers["X-Admin-Key"] || req.query.adminKey;
  if (k !== process.env.ADMIN_KEY) return res.status(403).json({ error:"Forbidden" });
  next();
};

// ── Helpers ───────────────────────────────────────────────────
const genCode = async () => {
  let code, found;
  do {
    code  = "MINE-" + Math.random().toString(36).slice(2,6).toUpperCase();
    found = await User.findOne({ refCode:code });
  } while (found);
  return code;
};

const safe = u => {
  const obj = typeof u?.toObject === "function" ? u.toObject() : { ...(u?._doc || u || {}) };
  delete obj.password;
  return obj;
};

const credit = async (user) => {
  if (!user.activePlan?.planId) return;
  const plan = PLANS.find(p => p.id === user.activePlan.planId);
  if (!plan) return;
  if (Date.now() > new Date(user.activePlan.expiresAt).getTime()) {
    user.activePlan = undefined; await user.save(); return;
  }
  const last  = user.lastCredit ? new Date(user.lastCredit) : new Date(user.activePlan.startedAt);
  const secs  = (Date.now() - last.getTime()) / 1000;
  if (secs < 30) return;
  const earned = (plan.daily / 86400) * secs;
  user.balance     = +((user.balance     || 0) + earned).toFixed(6);
  user.totalEarned = +((user.totalEarned || 0) + earned).toFixed(6);
  user.lastCredit  = new Date();
  await user.save();
};

const pushNote = (user, message, type = "info") => {
  if (!user.notifications) user.notifications = [];
  user.notifications.push({ message, type, date:new Date(), read:false });
};

const calcBonus = (amount) => {
  for (const b of DEPOSIT_BONUSES) {
    if (amount >= b.min && amount <= b.max)
      return { pct:b.pct, bonus:+(amount * b.pct / 100).toFixed(2) };
  }
  return { pct:0, bonus:0 };
};

const touchActive = async (userId) => {
  try { await User.updateOne({ _id:userId }, { lastActive:new Date() }); } catch {}
};

// ── Health ────────────────────────────────────────────────────
app.get("/",         (_, res) => res.json({ name:"USDTMINE API", status:"running", time:new Date() }));
app.get("/health",   (_, res) => res.json({ status:"ok", time:new Date() }));
app.get("/api/test", (_, res) => res.json({ message:"Backend is working!", time:new Date() }));

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, refCode } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error:"All fields required" });
    if (password.length < 6)          return res.status(400).json({ error:"Password min 6 chars" });
    if (await User.findOne({ email:email.toLowerCase().trim() }))
      return res.status(400).json({ error:"Email already registered" });

    let referrer = null;
    if (refCode?.trim())
      referrer = await User.findOne({ refCode:refCode.trim().toUpperCase() });

    const user = await User.create({
      name:       name.trim(),
      email:      email.toLowerCase().trim(),
      password:   await bcrypt.hash(password, 12),
      refCode:    await genCode(),
      referredBy: referrer?._id || null,
      lastActive: new Date(),
    });

    if (referrer) {
      referrer.referrals.push(user._id);
      pushNote(referrer, `🎉 ${user.name} joined using your referral link!`, "referral");
      await referrer.save();
    }

    const token = jwt.sign({ id:user._id, email:user.email }, process.env.JWT_SECRET, { expiresIn:"7d" });
    res.status(201).json({ token, user:safe(user) });
  } catch(e) { console.error("Register:", e.message); res.status(500).json({ error:"Server error: " + e.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error:"All fields required" });
    const user = await User.findOne({ email:email.toLowerCase().trim() });
    if (!user)          return res.status(400).json({ error:"No account with this email" });
    if (user.isBlocked) return res.status(403).json({ error:"Account suspended. Contact support." });
    if (!await bcrypt.compare(password, user.password))
      return res.status(400).json({ error:"Wrong password" });
    await credit(user);
    user.lastActive = new Date();
    await user.save();
    const token = jwt.sign({ id:user._id, email:user.email }, process.env.JWT_SECRET, { expiresIn:"7d" });
    res.json({ token, user:safe(user) });
  } catch(e) { console.error("Login:", e.message); res.status(500).json({ error:"Server error" }); }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error:"Not found" });
    await credit(user);
    user.lastActive = new Date();
    await user.save();
    res.json(safe(user));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/auth/notifications/read", auth, async (req, res) => {
  try {
    await User.updateOne({ _id:req.user.id }, { $set:{ "notifications.$[].read":true } });
    touchActive(req.user.id);
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ══════════════════════════════════════════════════════════════
// DEPOSITS
// ══════════════════════════════════════════════════════════════
app.post("/api/deposits", auth, async (req, res) => {
  try {
    const { planId, currency, txHash } = req.body;
    if (!planId || !currency || !txHash) return res.status(400).json({ error:"All fields required" });
    const plan = PLANS.find(p => p.id === Number(planId));
    if (!plan) return res.status(400).json({ error:"Invalid plan" });
    if (await Deposit.findOne({ txHash:txHash.trim() }))
      return res.status(400).json({ error:"TX hash already submitted" });

    const { pct, bonus } = calcBonus(plan.price);
    const dep = await Deposit.create({
      userId:req.user.id, planId:plan.id, planName:plan.name,
      amount:plan.price, bonus, bonusPct:pct, currency, txHash:txHash.trim(),
    });
    touchActive(req.user.id);
    const msg = bonus > 0
      ? `Deposit submitted! You'll receive a ${pct}% bonus (+$${bonus}) on approval!`
      : "Deposit submitted! Admin verifies within 1-12 hours.";
    res.status(201).json({ message:msg, deposit:dep, bonus, bonusPct:pct });
  } catch(e) { res.status(500).json({ error:"Server error: " + e.message }); }
});

app.get("/api/deposits", auth, async (req, res) => {
  try {
    touchActive(req.user.id);
    res.json(await Deposit.find({ userId:req.user.id }).sort({ createdAt:-1 }));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/deposit-addresses", (_, res) => res.json(DEPOSIT_ADDRESSES));

// ══════════════════════════════════════════════════════════════
// WITHDRAWALS
// ══════════════════════════════════════════════════════════════
app.post("/api/withdrawals", auth, async (req, res) => {
  try {
    const { amount, address, currency } = req.body;
    if (!amount || !address || !currency) return res.status(400).json({ error:"All fields required" });
    const user = await User.findById(req.user.id);
    await credit(user);
    if (!user.activePlan?.planId) return res.status(400).json({ error:"No active mining plan" });
    const plan = PLANS.find(p => p.id === user.activePlan.planId);
    const amt  = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ error:"Invalid amount" });
    if (amt < plan.minW)        return res.status(400).json({ error:`Minimum withdrawal is $${plan.minW}` });
    if (amt > user.balance)     return res.status(400).json({ error:"Insufficient balance" });
    user.balance -= amt;
    user.lastActive = new Date();
    await user.save();
    const w = await Withdrawal.create({ userId:req.user.id, amount:amt, address:address.trim(), currency });
    res.status(201).json({ message:"Withdrawal submitted! Processing within 24 hours.", withdrawal:w });
  } catch(e) { res.status(500).json({ error:"Server error: " + e.message }); }
});

app.get("/api/withdrawals", auth, async (req, res) => {
  try {
    touchActive(req.user.id);
    res.json(await Withdrawal.find({ userId:req.user.id }).sort({ createdAt:-1 }));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ══════════════════════════════════════════════════════════════
// REFERRALS & PLANS
// ══════════════════════════════════════════════════════════════
app.get("/api/referrals", auth, async (req, res) => {
  try {
    touchActive(req.user.id);
    const user = await User.findById(req.user.id).populate("referrals","name email activePlan createdAt");
    const refs = (user.referrals||[]).map(r => ({
      name:       r.name,
      email:      r.email.replace(/(.{2}).*@/,"$1***@"),
      activePlan: r.activePlan?.planId ? PLANS.find(p=>p.id===r.activePlan.planId)?.name : null,
      joinedAt:   r.createdAt,
    }));
    res.json({ referrals:refs, earnings:user.refEarnings, code:user.refCode, total:refs.length });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/plans", (_, res) => res.json(PLANS));

// ══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS (public news ticker)
// ══════════════════════════════════════════════════════════════
app.get("/api/announcements", async (req, res) => {
  try {
    const items = await Announcement.find({ active:true }).sort({ createdAt:-1 }).limit(10);
    res.json(items);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// Mark announcement as read by a user
app.post("/api/announcements/:id/read", auth, async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ error:"Not found" });
    const uid = req.user.id.toString();
    if (!ann.readBy.map(x=>x.toString()).includes(uid)) {
      ann.readBy.push(req.user.id);
      ann.reads = ann.readBy.length;
      await ann.save();
    }
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ══════════════════════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════════════════════
app.post("/api/chat", auth, async (req, res) => {
  try {
    const { message, language } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:"Message required" });
    touchActive(req.user.id);
    const msg = await Chat.create({
      userId:req.user.id, sender:"user",
      message:message.trim(), language:language||"English",
    });
    res.status(201).json(msg);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/chat", auth, async (req, res) => {
  try {
    touchActive(req.user.id);
    const msgs = await Chat.find({ userId:req.user.id }).sort({ createdAt:1 }).limit(100);
    await Chat.updateMany({ userId:req.user.id, sender:"admin", read:false }, { read:true });
    res.json(msgs);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/chat/unread", auth, async (req, res) => {
  try {
    const count = await Chat.countDocuments({ userId:req.user.id, sender:"admin", read:false });
    res.json({ count });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ══════════════════════════════════════════════════════════════
// ADMIN — STATS
// ══════════════════════════════════════════════════════════════
app.get("/api/admin/stats", adminAuth, async (req, res) => {
  try {
    const [totalUsers, pendingDeps, pendingWDs, approvedDeps, completedWDs, unreadChats] = await Promise.all([
      User.countDocuments(),
      Deposit.countDocuments({ status:"pending" }),
      Withdrawal.countDocuments({ status:"pending" }),
      Deposit.countDocuments({ status:"approved" }),
      Withdrawal.countDocuments({ status:"completed" }),
      Chat.countDocuments({ sender:"user", read:false }),
    ]);
    // Online = active in last 5 min
    const onlineCount = await User.countDocuments({ lastActive:{ $gte:new Date(Date.now()-5*60*1000) } });
    const [revAgg, balAgg] = await Promise.all([
      Deposit.aggregate([{ $match:{ status:"approved" } },{ $group:{ _id:null, t:{ $sum:"$amount" } } }]),
      User.aggregate([{ $group:{ _id:null, t:{ $sum:"$balance" } } }]),
    ]);
    res.json({ totalUsers, pendingDeps, pendingWDs, approvedDeps, completedWDs, unreadChats, onlineCount, revenue:revAgg[0]?.t||0, totalBalance:balAgg[0]?.t||0 });
  } catch(e) { res.status(500).json({ error:"Server error: " + e.message }); }
});

// ── Admin — Deposits ──────────────────────────────────────────
app.get("/api/admin/deposits", adminAuth, async (req, res) => {
  try {
    const { status="pending" } = req.query;
    res.json(await Deposit.find(status==="all"?{}:{status}).populate("userId","name email").sort({ createdAt:-1 }).limit(200));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/deposits/:id/approve", adminAuth, async (req, res) => {
  try {
    const dep = await Deposit.findById(req.params.id).populate("userId");
    if (!dep)                     return res.status(404).json({ error:"Not found" });
    if (dep.status !== "pending") return res.status(400).json({ error:"Already processed" });
    const plan = PLANS.find(p => p.id === dep.planId);
    const user = dep.userId;
    dep.status = "approved"; await dep.save();
    user.activePlan = { planId:plan.id, planName:plan.name, startedAt:new Date(), expiresAt:new Date(Date.now()+plan.days*86400000) };
    user.lastCredit = new Date();
    if (dep.bonus > 0) {
      user.balance     = +((user.balance     || 0) + dep.bonus).toFixed(6);
      user.totalEarned = +((user.totalEarned || 0) + dep.bonus).toFixed(6);
      pushNote(user, `🎁 ${dep.bonusPct}% deposit bonus applied! +$${dep.bonus} added to your balance!`, "success");
    }
    pushNote(user, `✅ Deposit approved! ${plan.icon} ${plan.name} plan active. Earning $${plan.daily}/day!`, "success");
    await user.save();
    if (user.referredBy) {
      const ref = await User.findById(user.referredBy);
      if (ref) {
        const bonus = +(plan.price * 0.1).toFixed(2);
        ref.balance += bonus; ref.refEarnings += bonus; ref.totalEarned += bonus;
        pushNote(ref, `💰 You earned $${bonus} referral bonus from ${user.name}'s ${plan.name} plan!`, "success");
        await ref.save();
      }
    }
    res.json({ message:`✅ Approved! ${plan.name} activated for ${user.name}` });
  } catch(e) { console.error(e); res.status(500).json({ error:"Server error: " + e.message }); }
});

app.post("/api/admin/deposits/:id/reject", adminAuth, async (req, res) => {
  try {
    const { note } = req.body;
    const dep = await Deposit.findById(req.params.id).populate("userId");
    if (!dep) return res.status(404).json({ error:"Not found" });
    dep.status = "rejected"; dep.adminNote = note||""; await dep.save();
    pushNote(dep.userId, `❌ Deposit of $${dep.amount} rejected. ${note||"Contact support."}`, "error");
    await dep.userId.save();
    res.json({ message:"Deposit rejected" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ── Admin — Withdrawals ───────────────────────────────────────
app.get("/api/admin/withdrawals", adminAuth, async (req, res) => {
  try {
    const { status="pending" } = req.query;
    res.json(await Withdrawal.find(status==="all"?{}:{status}).populate("userId","name email").sort({ createdAt:-1 }).limit(200));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/withdrawals/:id/complete", adminAuth, async (req, res) => {
  try {
    const { txHash } = req.body;
    const w = await Withdrawal.findById(req.params.id).populate("userId");
    if (!w) return res.status(404).json({ error:"Not found" });
    w.status = "completed"; w.txHash = txHash||""; await w.save();
    const user = await User.findById(w.userId._id||w.userId);
    if (user) { pushNote(user, `✅ Withdrawal of $${w.amount} sent! TX: ${txHash||"processed"}`, "success"); await user.save(); }
    res.json({ message:"Withdrawal completed" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/withdrawals/:id/reject", adminAuth, async (req, res) => {
  try {
    const { note } = req.body;
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error:"Not found" });
    const user = await User.findById(w.userId);
    if (user) { user.balance += w.amount; pushNote(user, `❌ Withdrawal of $${w.amount} rejected. Refunded. ${note||""}`, "error"); await user.save(); }
    w.status = "rejected"; w.adminNote = note||""; await w.save();
    res.json({ message:"Rejected and refunded" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ── Admin — Users ─────────────────────────────────────────────
app.get("/api/admin/users", adminAuth, async (req, res) => {
  try {
    const { search="" } = req.query;
    const q = search ? { $or:[{ name:new RegExp(search,"i") },{ email:new RegExp(search,"i") }] } : {};
    res.json(await User.find(q,"-password").sort({ createdAt:-1 }).limit(500));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/block", adminAuth, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    u.isBlocked = !u.isBlocked; await u.save();
    res.json({ message:`User ${u.isBlocked?"blocked":"unblocked"}`, isBlocked:u.isBlocked });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/adjust-balance", adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    const amt = parseFloat(amount);
    u.balance = Math.max(0, +((u.balance||0) + amt).toFixed(6));
    pushNote(u, `💰 Admin sent you $${Math.abs(amt).toFixed(2)}! Your balance has been updated.`, "success");
    await u.save();
    res.json({ message:"Balance adjusted", newBalance:u.balance });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/send-money", adminAuth, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error:"Invalid amount" });
    u.balance     = +((u.balance     || 0) + amt).toFixed(6);
    u.totalEarned = +((u.totalEarned || 0) + amt).toFixed(6);
    pushNote(u, `💸 Admin sent you $${amt.toFixed(2)}! ${note||"Enjoy your earnings!"}`, "success");
    await u.save();
    res.json({ message:`✅ Sent $${amt} to ${u.name}`, newBalance:u.balance });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/set-plan", adminAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    const plan = PLANS.find(p => p.id === Number(planId));
    if (!plan) return res.status(400).json({ error:"Invalid plan" });
    u.activePlan = { planId:plan.id, planName:plan.name, startedAt:new Date(), expiresAt:new Date(Date.now()+plan.days*86400000) };
    u.lastCredit = new Date();
    pushNote(u, `🎁 Admin upgraded your plan to ${plan.icon} ${plan.name}!`, "success");
    await u.save();
    res.json({ message:`Set ${plan.name} for ${u.name}` });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/remove-plan", adminAuth, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    u.activePlan = undefined; await u.save();
    res.json({ message:"Plan removed" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/notify", adminAuth, async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:"Message required" });
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    pushNote(u, message, type||"info");
    await u.save();
    res.json({ message:"Notification sent" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/notify-all", adminAuth, async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:"Message required" });
    const users = await User.find({});
    for (const u of users) { pushNote(u, message, type||"info"); await u.save(); }
    res.json({ message:`Notification sent to ${users.length} users` });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ── Admin — Chat ──────────────────────────────────────────────
app.get("/api/admin/chat/threads", adminAuth, async (req, res) => {
  try {
    const threads = await Chat.aggregate([
      { $sort:{ createdAt:-1 } },
      { $group:{
        _id:"$userId",
        lastMessage:{ $first:"$message" },
        lastSender:{ $first:"$sender" },
        lastTime:{ $first:"$createdAt" },
        unread:{ $sum:{ $cond:[{ $and:[{ $eq:["$sender","user"] },{ $eq:["$read",false] }] },1,0] } },
      }},
      { $sort:{ lastTime:-1 } },
      { $limit:100 },
    ]);
    const populated = await Promise.all(threads.map(async t => {
      const u = await User.findById(t._id,"name email lastActive");
      return { ...t, user:u };
    }));
    res.json(populated);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/admin/chat/:userId", adminAuth, async (req, res) => {
  try {
    const msgs = await Chat.find({ userId:req.params.userId }).sort({ createdAt:1 }).limit(200);
    await Chat.updateMany({ userId:req.params.userId, sender:"user", read:false }, { read:true });
    res.json(msgs);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/chat/:userId/reply", adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:"Message required" });
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error:"User not found" });
    const msg = await Chat.create({
      userId:req.params.userId, sender:"admin",
      message:message.trim(), language:"English",
    });
    pushNote(user, `💬 New reply from support: "${message.slice(0,60)}${message.length>60?"...":""}"`, "info");
    await user.save();
    res.status(201).json(msg);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ── Admin — Announcements ─────────────────────────────────────
app.get("/api/admin/announcements", adminAuth, async (req, res) => {
  try { res.json(await Announcement.find().sort({ createdAt:-1 }).limit(50)); }
  catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/announcements", adminAuth, async (req, res) => {
  try {
    const { text, type, emoji } = req.body;
    if (!text?.trim()) return res.status(400).json({ error:"Text required" });
    const a = await Announcement.create({ text:text.trim(), type:type||"info", emoji:emoji||"📢" });
    res.status(201).json(a);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.patch("/api/admin/announcements/:id", adminAuth, async (req, res) => {
  try {
    const a = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new:true });
    res.json(a);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.delete("/api/admin/announcements/:id", adminAuth, async (req, res) => {
  try { await Announcement.findByIdAndDelete(req.params.id); res.json({ message:"Deleted" }); }
  catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ── Export ────────────────────────────────────────────────────
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}
