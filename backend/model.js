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
  lastCredit:  { type:Date, default:null },
  showWelcome: { type:Boolean, default:true },
  isBlocked:   { type:Boolean, default:false },
  notifications: [{
    message: String,
    type:    { type:String, default:"info" },
    read:    { type:Boolean, default:false },
    date:    { type:Date, default:Date.now },
  }],
}, { timestamps:true });

const depositSchema = new mongoose.Schema({
  userId:   { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  planId:   { type:Number, required:true },
  planName: { type:String, required:true },
  amount:   { type:Number, required:true },
  currency: { type:String, enum:["USDT","TRX"], required:true },
  txHash:   { type:String, required:true, trim:true },
  status:   { type:String, enum:["pending","approved","rejected"], default:"pending" },
  adminNote:{ type:String, default:"" },
}, { timestamps:true });

const withdrawalSchema = new mongoose.Schema({
  userId:   { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  amount:   { type:Number, required:true },
  address:  { type:String, required:true },
  currency: { type:String, enum:["USDT","TRX"], required:true },
  status:   { type:String, enum:["pending","processing","completed","rejected"], default:"pending" },
  adminNote:{ type:String, default:"" },
  txHash:   { type:String, default:"" },
}, { timestamps:true });

const User       = mongoose.model("User", userSchema);
const Deposit    = mongoose.model("Deposit", depositSchema);
const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

module.exports = { User, Deposit, Withdrawal, PLANS };
