const mongoose = require("mongoose");

const PLANS = [
  { id:1, name:"Starter",  price:15,   daily:2,   minW:4,   days:30, icon:"🌱" },
  { id:2, name:"Basic",    price:25,   daily:5,   minW:8,   days:30, icon:"⚡" },
  { id:3, name:"Bronze",   price:50,   daily:10,  minW:15,  days:30, icon:"🥉" },
  { id:4, name:"Silver",   price:100,  daily:22,  minW:30,  days:30, icon:"🥈" },
  { id:5, name:"Gold",     price:250,  daily:60,  minW:80,  days:30, icon:"🥇" },
  { id:6, name:"Platinum", price:500,  daily:130, minW:150, days:30, icon:"💎" },
  { id:7, name:"Diamond",  price:1000, daily:280, minW:300, days:30, icon:"👑" },
];

// Deposit bonus tiers
const DEPOSIT_BONUSES = [
  { min:15,  max:50,   pct:20 },
  { min:100, max:1000, pct:35 },
];

// Deposit addresses per coin — update before deploy
const DEPOSIT_ADDRESSES = {
  USDT: process.env.DEPOSIT_ADDRESS || "TTGZnhafw44MWzKBTgmHWLeVFZuQHTxaeH",
  TRX:  process.env.DEPOSIT_ADDRESS_TRX  || "TTGZnhafw44MWzKBTgmHWLeVFZuQHTxaeH",
  BTC:  process.env.DEPOSIT_ADDRESS_BTC  || "bc1q000000000000000000000000000000",
  ETH:  process.env.DEPOSIT_ADDRESS_ETH  || "0x0000000000000000000000000000000000000000",
  DOGE: process.env.DEPOSIT_ADDRESS_DOGE || "D000000000000000000000000000000000",
};

// ── User ──────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:         { type:String, required:true, trim:true },
  email:        { type:String, required:true, unique:true, lowercase:true, trim:true },
  password:     { type:String, required:true },
  balance:      { type:Number, default:0 },
  totalEarned:  { type:Number, default:0 },
  refCode:      { type:String, unique:true },
  referredBy:   { type:mongoose.Schema.Types.ObjectId, ref:"User", default:null },
  referrals:    [{ type:mongoose.Schema.Types.ObjectId, ref:"User" }],
  refEarnings:  { type:Number, default:0 },
  activePlan: {
    planId:    Number,
    planName:  String,
    startedAt: Date,
    expiresAt: Date,
  },
  lastCredit:   { type:Date, default:null },
  lastActive:   { type:Date, default:null },   // ← track last seen
  showWelcome:  { type:Boolean, default:true },
  isBlocked:    { type:Boolean, default:false },
  notifications: [{
    message:  String,
    type:     { type:String, default:"info" },
    read:     { type:Boolean, default:false },
    date:     { type:Date,   default:Date.now },
  }],
}, { timestamps:true });

// ── Deposit ───────────────────────────────────────────────────
const depositSchema = new mongoose.Schema({
  userId:    { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  planId:    { type:Number, required:true },
  planName:  { type:String, required:true },
  amount:    { type:Number, required:true },
  bonus:     { type:Number, default:0 },
  bonusPct:  { type:Number, default:0 },
  currency:  { type:String, enum:["USDT","TRX","BTC","ETH","DOGE"], required:true },
  txHash:    { type:String, required:true, trim:true },
  status:    { type:String, enum:["pending","approved","rejected"], default:"pending" },
  adminNote: { type:String, default:"" },
}, { timestamps:true });

// ── Withdrawal ────────────────────────────────────────────────
const withdrawalSchema = new mongoose.Schema({
  userId:    { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  amount:    { type:Number, required:true },
  address:   { type:String, required:true },
  currency:  { type:String, enum:["USDT","TRX","BTC","ETH","DOGE"], required:true },
  status:    { type:String, enum:["pending","processing","completed","rejected"], default:"pending" },
  adminNote: { type:String, default:"" },
  txHash:    { type:String, default:"" },
}, { timestamps:true });

// ── Chat ──────────────────────────────────────────────────────
const chatSchema = new mongoose.Schema({
  userId:   { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  sender:   { type:String, enum:["user","admin"], required:true },
  message:  { type:String, required:true, trim:true },
  language: { type:String, default:"English" },
  read:     { type:Boolean, default:false },
}, { timestamps:true });

// ── Announcement (News Ticker) ────────────────────────────────
const announcementSchema = new mongoose.Schema({
  text:     { type:String, required:true, trim:true },
  emoji:    { type:String, default:"📢" },
  type:     { type:String, enum:["info","warning","success","urgent"], default:"info" },
  active:   { type:Boolean, default:true },
  reads:    { type:Number,  default:0 },           // ← how many users saw it
  readBy:   [{ type:mongoose.Schema.Types.ObjectId, ref:"User" }], // ← who read it
}, { timestamps:true });

const User         = mongoose.model("User",         userSchema);
const Deposit      = mongoose.model("Deposit",      depositSchema);
const Withdrawal   = mongoose.model("Withdrawal",   withdrawalSchema);
const Chat         = mongoose.model("Chat",         chatSchema);
const Announcement = mongoose.model("Announcement", announcementSchema);

module.exports = { User, Deposit, Withdrawal, Chat, Announcement, PLANS, DEPOSIT_BONUSES, DEPOSIT_ADDRESSES };
