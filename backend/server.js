require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const { User, Deposit, Withdrawal, PLANS } = require("./model");

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs:15*60*1000, max:500 }));

// ── MongoDB ───────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB:", err.message); process.exit(1); });


  // Example API route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// ── Auth middleware ───────────────────────────────────────────
const auth = (req,res,next) => {
  const t = req.headers.authorization?.split(" ")[1];
  if (!t) return res.status(401).json({ error:"No token" });
  try { req.user = jwt.verify(t, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error:"Invalid token" }); }
};
const adminAuth = (req,res,next) => {
  const k = req.headers["x-admin-key"] || req.query.adminKey;
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

// FIXED: Now safely handles Mongoose documents and plain objects
const safe = u => { 
  const obj = (u && typeof u.toObject === 'function') ? u.toObject() : (u?._doc || u || {});
  const o = { ...obj };
  delete o.password; 
  return o; 
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
  user.balance     = +(( user.balance    ||0) + earned).toFixed(6);
  user.totalEarned = +((user.totalEarned ||0) + earned).toFixed(6);
  user.lastCredit  = new Date();
  await user.save();
};

// Hourly cron
setInterval(async () => {
  try {
    const users = await User.find({ "activePlan.planId": { $exists:true, $ne:null } });
    for (const u of users) await credit(u);
    if (users.length) console.log(`⚡ Credited ${users.length} users`);
  } catch(e) { console.error("Cron error:", e.message); }
}, 3600000);

const pushNote = (user, message, type="info") => {
  user.notifications.push({ message, type, date:new Date(), read:false });
};

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
app.post("/api/auth/register", async (req,res) => {
  try {
    const { name, email, password, refCode } = req.body;
    if (!name||!email||!password) return res.status(400).json({ error:"All fields required" });
    if (password.length < 6) return res.status(400).json({ error:"Password min 6 chars" });
    if (await User.findOne({ email:email.toLowerCase().trim() }))
      return res.status(400).json({ error:"Email already registered" });

    let referrer = null;
    if (refCode?.trim())
      referrer = await User.findOne({ refCode: refCode.trim().toUpperCase() });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: await bcrypt.hash(password, 12),
      refCode: await genCode(),
      referredBy: referrer?._id || null,
    });

    if (referrer) {
      referrer.referrals.push(user._id);
      pushNote(referrer, `🎉 ${user.name} joined using your referral link!`, "referral");
      await referrer.save();
    }

    const token = jwt.sign({ id:user._id, email:user.email }, process.env.JWT_SECRET, { expiresIn:"7d" });
    res.status(201).json({ token, user: safe(user) });
  } catch(e) { console.error(e); res.status(500).json({ error:"Server error: "+e.message }); }
});

app.post("/api/auth/login", async (req,res) => {
  try {
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ error:"All fields required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error:"No account with this email" });
    if (user.isBlocked) return res.status(403).json({ error:"Account suspended. Contact support." });
    if (!await bcrypt.compare(password, user.password))
      return res.status(400).json({ error:"Wrong password" });
    
    // Perform credit
    await credit(user);
    
    // Refresh to get updated balance
    const updatedUser = await User.findById(user._id);
    const token = jwt.sign({ id:updatedUser._id, email:updatedUser.email }, process.env.JWT_SECRET, { expiresIn:"7d" });
    res.json({ token, user: safe(updatedUser) });
  } catch(e) { console.error(e); res.status(500).json({ error:"Server error" }); }
});

app.get("/api/auth/me", auth, async (req,res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error:"Not found" });
    await credit(user);
    const updatedUser = await User.findById(req.user.id);
    res.json(safe(updatedUser));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/auth/notifications/read", auth, async (req,res) => {
  try {
    await User.updateOne({ _id:req.user.id }, { $set:{ "notifications.$[].read":true } });
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});






// ═══════════════════════════════════════════════════════════════
// DEPOSITS
// ═══════════════════════════════════════════════════════════════
app.post("/api/deposits", auth, async (req,res) => {
  try {
    const { planId, currency, txHash } = req.body;
    if (!planId||!currency||!txHash) return res.status(400).json({ error:"All fields required" });
    const plan = PLANS.find(p => p.id === Number(planId));
    if (!plan) return res.status(400).json({ error:"Invalid plan" });
    if (await Deposit.findOne({ txHash:txHash.trim() }))
      return res.status(400).json({ error:"TX hash already submitted" });
    const dep = await Deposit.create({ userId:req.user.id, planId:plan.id, planName:plan.name, amount:plan.price, currency, txHash:txHash.trim() });
    res.status(201).json({ message:"Deposit submitted! Admin will verify within 1-12 hours.", deposit:dep });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/deposits", auth, async (req,res) => {
  try {
    res.json(await Deposit.find({ userId:req.user.id }).sort({ createdAt:-1 }));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ═══════════════════════════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════════════════════════
app.post("/api/withdrawals", auth, async (req,res) => {
  try {
    const { amount, address, currency } = req.body;
    if (!amount||!address||!currency) return res.status(400).json({ error:"All fields required" });
    const user = await User.findById(req.user.id);
    await credit(user);
    if (!user.activePlan?.planId) return res.status(400).json({ error:"No active mining plan" });
    const plan = PLANS.find(p => p.id === user.activePlan.planId);
    const amt  = parseFloat(amount);
    if (isNaN(amt)||amt<=0)  return res.status(400).json({ error:"Invalid amount" });
    if (amt < plan.minW)     return res.status(400).json({ error:`Minimum withdrawal is $${plan.minW}` });
    if (amt > user.balance)  return res.status(400).json({ error:"Insufficient balance" });
    user.balance -= amt;
    await user.save();
    const w = await Withdrawal.create({ userId:req.user.id, amount:amt, address:address.trim(), currency });
    res.status(201).json({ message:"Withdrawal submitted! Processing within 24 hours.", withdrawal:w });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/withdrawals", auth, async (req,res) => {
  try {
    res.json(await Withdrawal.find({ userId:req.user.id }).sort({ createdAt:-1 }));
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ═══════════════════════════════════════════════════════════════
// REFERRALS
// ═══════════════════════════════════════════════════════════════
app.get("/api/referrals", auth, async (req,res) => {
  try {
    const user = await User.findById(req.user.id).populate("referrals","name email activePlan createdAt");
    const refs = (user.referrals||[]).map(r => ({
      name: r.name,
      email: r.email.replace(/(.{2}).*@/,"$1***@"),
      activePlan: r.activePlan?.planId ? PLANS.find(p=>p.id===r.activePlan.planId)?.name : null,
      joinedAt: r.createdAt,
    }));
    res.json({ referrals:refs, earnings:user.refEarnings, code:user.refCode, total:refs.length });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════
app.get("/api/admin/stats", adminAuth, async (req,res) => {
  try {
    const [totalUsers, pendingDeps, pendingWDs, approvedDeps, completedWDs] = await Promise.all([
      User.countDocuments(),
      Deposit.countDocuments({ status:"pending" }),
      Withdrawal.countDocuments({ status:"pending" }),
      Deposit.countDocuments({ status:"approved" }),
      Withdrawal.countDocuments({ status:"completed" }),
    ]);
    const [revAgg, balAgg] = await Promise.all([
      Deposit.aggregate([{ $match:{ status:"approved" } },{ $group:{ _id:null, t:{ $sum:"$amount" } } }]),
      User.aggregate([{ $group:{ _id:null, t:{ $sum:"$balance" } } }]),
    ]);
    res.json({ totalUsers, pendingDeps, pendingWDs, approvedDeps, completedWDs, revenue:revAgg[0]?.t||0, totalBalance:balAgg[0]?.t||0 });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/admin/deposits", adminAuth, async (req,res) => {
  try {
    const { status="pending" } = req.query;
    const q = status==="all" ? {} : { status };
    const deps = await Deposit.find(q).populate("userId","name email").sort({ createdAt:-1 }).limit(200);
    res.json(deps);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/deposits/:id/approve", adminAuth, async (req,res) => {
  try {
    const dep = await Deposit.findById(req.params.id).populate("userId");
    if (!dep)              return res.status(404).json({ error:"Not found" });
    if (dep.status!=="pending") return res.status(400).json({ error:"Already processed" });
    const plan = PLANS.find(p => p.id === dep.planId);
    const user = dep.userId;
    dep.status = "approved"; await dep.save();
    user.activePlan = { planId:plan.id, planName:plan.name, startedAt:new Date(), expiresAt:new Date(Date.now()+plan.days*86400000) };
    user.lastCredit = new Date();
    pushNote(user, `✅ Deposit approved! ${plan.icon} ${plan.name} plan is now active. Earning $${plan.daily}/day!`, "success");
    await user.save();
    if (user.referredBy) {
      const ref = await User.findById(user.referredBy);
      if (ref) {
        const bonus = +(plan.price * 0.1).toFixed(2);
        ref.balance     += bonus;
        ref.refEarnings += bonus;
        ref.totalEarned += bonus;
        pushNote(ref, `💰 You earned $${bonus} referral bonus from ${user.name}'s ${plan.name} plan!`, "success");
        await ref.save();
      }
    }
    res.json({ message:`✅ Approved! ${plan.name} activated for ${user.name}` });
  } catch(e) { console.error(e); res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/deposits/:id/reject", adminAuth, async (req,res) => {
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

app.get("/api/admin/withdrawals", adminAuth, async (req,res) => {
  try {
    const { status="pending" } = req.query;
    const q = status==="all" ? {} : { status };
    const ws = await Withdrawal.find(q).populate("userId","name email").sort({ createdAt:-1 }).limit(200);
    res.json(ws);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/withdrawals/:id/complete", adminAuth, async (req,res) => {
  try {
    const { txHash } = req.body;
    const w = await Withdrawal.findById(req.params.id).populate("userId");
    if (!w) return res.status(404).json({ error:"Not found" });
    w.status = "completed"; w.txHash = txHash||""; await w.save();
    const user = await User.findById(w.userId._id||w.userId);
    if (user) { pushNote(user, `✅ Withdrawal of $${w.amount} USDT has been sent! TX: ${txHash||"processed"}`, "success"); await user.save(); }
    res.json({ message:"Withdrawal completed" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/withdrawals/:id/reject", adminAuth, async (req,res) => {
  try {
    const { note } = req.body;
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error:"Not found" });
    const user = await User.findById(w.userId);
    if (user) { user.balance += w.amount; pushNote(user, `❌ Withdrawal of $${w.amount} rejected. Amount refunded. ${note||""}`, "error"); await user.save(); }
    w.status = "rejected"; w.adminNote = note||""; await w.save();
    res.json({ message:"Rejected and refunded" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/admin/users", adminAuth, async (req,res) => {
  try {
    const { search="" } = req.query;
    const q = search ? { $or:[{ name:new RegExp(search,"i") },{ email:new RegExp(search,"i") }] } : {};
    const users = await User.find(q,"-password").sort({ createdAt:-1 }).limit(500);
    res.json(users);
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/block", adminAuth, async (req,res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    u.isBlocked = !u.isBlocked; await u.save();
    res.json({ message:`User ${u.isBlocked?"blocked":"unblocked"}`, isBlocked:u.isBlocked });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/adjust-balance", adminAuth, async (req,res) => {
  try {
    const { amount } = req.body;
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    const amt = parseFloat(amount);
    u.balance = Math.max(0, +(( u.balance||0) + amt).toFixed(6));
    pushNote(u, `💰 Admin adjusted your balance ${amt>=0?"+":""}$${amt.toFixed(2)}`, "info");
    await u.save();
    res.json({ message:"Balance adjusted", newBalance:u.balance });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.post("/api/admin/users/:id/set-plan", adminAuth, async (req,res) => {
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

app.post("/api/admin/users/:id/remove-plan", adminAuth, async (req,res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error:"Not found" });
    u.activePlan = undefined; await u.save();
    res.json({ message:"Plan removed" });
  } catch(e) { res.status(500).json({ error:"Server error" }); }
});

app.get("/api/plans", (_,res) => res.json(PLANS));
app.get("/health",   (_,res) => res.json({ status:"ok", time:new Date() }));

module.exports = app;