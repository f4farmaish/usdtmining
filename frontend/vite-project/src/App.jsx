import { useState, useEffect, useCallback, useRef } from "react";
import { api, PLANS, DEPOSIT_ADDRESS, fmt, fmt4, timeAgo } from "./api.js";
import AdminPanel from "./Admin.jsx";

// ── Constants ──────────────────────────────────────────────────────────────
const SC = { LOGIN:"login", REG:"reg", DASH:"dash", PLANS:"plans", DEPOSIT:"deposit", WALLET:"wallet", REF:"ref" };

// ── Particles ──────────────────────────────────────────────────────────────
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({length:50},()=>({
      x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight,
      vx:(Math.random()-.5)*.2, vy:(Math.random()-.5)*.2,
      r:Math.random()*1.5+.3,
      hue:Math.random()>.5?"167,139,250":"96,165,250",
    }));
    let id;
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>c.width)  p.vx*=-1;
        if(p.y<0||p.y>c.height) p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${p.hue},.15)`; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<100){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(167,139,250,${.05*(1-d/100)})`;ctx.lineWidth=.5;ctx.stroke();}
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// ── UI Primitives ──────────────────────────────────────────────────────────
const C = {
  bg:"#060412", card:"rgba(12,8,32,.97)", border:"rgba(167,139,250,.12)",
  accent:"#a78bfa", blue:"#60a5fa", gold:"#fbbf24",
  text:"#e2e8f0", dim:"rgba(226,232,240,.5)", faint:"rgba(226,232,240,.18)",
  green:"#34d399", red:"#f87171", mono:"'Space Mono',monospace",
};

function Card({children, style={}, glow=false, grad=false}) {
  return (
    <div style={{
      background: grad
        ? "linear-gradient(135deg,rgba(76,29,149,.5),rgba(12,8,32,.98))"
        : C.card,
      border:`1px solid ${glow?"rgba(167,139,250,.3)":C.border}`,
      borderRadius:16, padding:20,
      boxShadow: glow ? "0 0 40px rgba(124,58,237,.1),inset 0 1px 0 rgba(167,139,250,.08)" : "none",
      backdropFilter:"blur(20px)",
      animation:"fadeUp .3s ease",
      ...style,
    }}>{children}</div>
  );
}

function Lbl({children, c=C.accent}) {
  return <div style={{color:c,fontSize:9,letterSpacing:2.5,textTransform:"uppercase",fontFamily:C.mono,marginBottom:8,fontWeight:700}}>{children}</div>;
}

function Input({label,type="text",value,onChange,placeholder,readOnly,icon,hint}) {
  const [focus,setFocus]=useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label && <Lbl>{label}</Lbl>}
      <div style={{position:"relative"}}>
        {icon && <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none",zIndex:1}}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
          onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
          style={{
            width:"100%",
            background:focus?"rgba(167,139,250,.07)":"rgba(255,255,255,.02)",
            border:`1px solid ${focus?"rgba(167,139,250,.5)":"rgba(167,139,250,.12)"}`,
            borderRadius:10, padding:`13px ${icon?"42px":"14px"} 13px ${icon?"42px":"14px"}`,
            color:C.text, fontSize:14, fontFamily:"inherit",
            outline:"none", transition:"all .2s",
            cursor:readOnly?"default":"text",
          }}
        />
      </div>
      {hint && <div style={{color:C.faint,fontSize:10,marginTop:5,fontFamily:C.mono}}>{hint}</div>}
    </div>
  );
}

function Btn({children,onClick,disabled,variant="primary",grad,full=true,style={},size="md"}) {
  const [h,setH]=useState(false);
  const pad = size==="sm" ? "9px 14px" : "13px 20px";
  const fs  = size==="sm" ? 9 : 11;
  let bg,color,border;
  if(grad)          { bg=`linear-gradient(${grad})`; color="#fff"; border="none"; }
  else if(variant==="primary") { bg="linear-gradient(135deg,#7c3aed,#a78bfa)"; color="#fff"; border="none"; }
  else if(variant==="outline") { bg="transparent"; color=C.accent; border=`1px solid rgba(167,139,250,.25)`; }
  else              { bg="rgba(167,139,250,.08)"; color=C.accent; border=`1px solid rgba(167,139,250,.12)`; }
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseOver={()=>setH(true)} onMouseOut={()=>setH(false)}
      style={{
        width:full?"100%":"auto", padding:pad, borderRadius:10,
        fontFamily:C.mono, fontWeight:700, fontSize:fs, letterSpacing:1.5,
        textTransform:"uppercase", transition:"all .2s",
        opacity:disabled?.4:1, background:bg, color, border,
        boxShadow:h&&!disabled?`0 8px 28px rgba(124,58,237,.4)`:"none",
        transform:h&&!disabled?"translateY(-1px)":"translateY(0)",
        cursor:disabled?"not-allowed":"pointer",
        ...style,
      }}>{children}</button>
  );
}

function Toast({msg,type}) {
  if(!msg) return null;
  const bg = type==="error"?"linear-gradient(135deg,#dc2626,#ef4444)":"linear-gradient(135deg,#059669,#34d399)";
  return (
    <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,
      background:bg,color:"#fff",padding:"12px 22px",borderRadius:12,fontFamily:C.mono,
      fontSize:11,letterSpacing:1,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,.6)",
      animation:"slideDown .3s ease",whiteSpace:"nowrap",maxWidth:"90vw",textAlign:"center"}}>
      {type==="error"?"❌ ":"✅ "}{msg}
    </div>
  );
}

function Spinner({size=20,c=C.accent}) {
  return <div style={{width:size,height:size,border:`2px solid rgba(167,139,250,.15)`,borderTop:`2px solid ${c}`,borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>;
}

function Badge({children,color=C.accent}) {
  return <span style={{background:`${color}18`,border:`1px solid ${color}30`,color,fontSize:8,letterSpacing:1.5,padding:"2px 8px",borderRadius:6,fontFamily:C.mono,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
}

function StatusBadge({s}) {
  const map={pending:[C.gold,"PENDING"],approved:[C.green,"APPROVED"],completed:[C.green,"COMPLETED"],rejected:[C.red,"REJECTED"],processing:[C.blue,"PROCESSING"]};
  const [col,label]=map[s]||[C.faint,s?.toUpperCase()];
  return <Badge color={col}>{label}</Badge>;
}

// ── Welcome Modal ──────────────────────────────────────────────────────────
function WelcomeModal({user,onClose}) {
  const [tab,setTab]=useState(0);
  const refs = user.referrals?.length||0;
  const offers=[
    {target:20,reward:"FREE Starter Plan ($15 value)",color:C.accent,icon:"🎁"},
    {target:2, reward:"FREE Basic Plan ($25 value)",  color:C.blue,  icon:"⚡"},
  ];
  const o=offers[tab];
  return (
    <div style={{position:"fixed",inset:0,zIndex:8000,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(12px)"}}>
      <Card glow style={{width:"100%",maxWidth:440,padding:0,overflow:"hidden",animation:"slideDown .4s ease"}}>
        <div style={{background:"linear-gradient(135deg,#3b0764,#1e1b4b)",padding:"22px 20px 18px",position:"relative"}}>
          <div style={{position:"absolute",inset:0,opacity:.4,background:"radial-gradient(circle at 20% 50%,rgba(167,139,250,.6),transparent 60%),radial-gradient(circle at 80% 20%,rgba(96,165,250,.4),transparent 55%)"}}/>
          <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{color:"rgba(251,191,36,.9)",fontSize:9,letterSpacing:3,fontFamily:C.mono,marginBottom:6}}>🔥 SPECIAL WELCOME OFFERS</div>
              <div style={{color:"#fff",fontSize:19,fontWeight:700,lineHeight:1.2}}>Earn FREE Mining Plans</div>
              <div style={{color:"rgba(167,139,250,.6)",fontSize:11,marginTop:4}}>Invite friends and unlock rewards</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",border:"none",color:"#fff",width:30,height:30,borderRadius:8,fontSize:14,flexShrink:0}}>✕</button>
          </div>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {offers.map((_,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"11px 8px",background:tab===i?"rgba(167,139,250,.08)":"transparent",border:"none",fontFamily:C.mono,fontSize:9,letterSpacing:1.5,color:tab===i?C.accent:C.dim,borderBottom:tab===i?`2px solid ${C.accent}`:"2px solid transparent",transition:"all .2s"}}>
              OFFER {i+1}
            </button>
          ))}
        </div>
        <div style={{padding:20}}>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:44,marginBottom:10,animation:"float 3s ease-in-out infinite"}}>{o.icon}</div>
            <div style={{color:o.color,fontFamily:C.mono,fontSize:13,fontWeight:700,marginBottom:6}}>
              {tab===0?"Invite 20 Friends":"Invite 2 Active Friends"} → {o.reward}
            </div>
            <div style={{color:C.dim,fontSize:12,lineHeight:1.6}}>
              {tab===0?"Refer 20 friends who register and get the Starter plan FREE for 30 days!"
                      :"Get 2 friends to activate any plan and earn the Basic plan completely FREE!"}
            </div>
          </div>
          <div style={{background:"rgba(167,139,250,.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{color:C.dim,fontSize:10,fontFamily:C.mono}}>YOUR PROGRESS</span>
              <span style={{color:o.color,fontSize:11,fontFamily:C.mono,fontWeight:700}}>{Math.min(refs,o.target)}/{o.target}</span>
            </div>
            <div style={{height:6,background:"rgba(167,139,250,.08)",borderRadius:3}}>
              <div style={{height:"100%",width:`${Math.min(100,(refs/o.target)*100)}%`,background:`linear-gradient(90deg,${o.color}77,${o.color})`,borderRadius:3,transition:"width .5s"}}/>
            </div>
            <div style={{color:C.faint,fontSize:9,fontFamily:C.mono,marginTop:5}}>{Math.max(0,o.target-refs)} more referrals needed</div>
          </div>
          <Btn onClick={onClose}>START REFERRING →</Btn>
          <div style={{textAlign:"center",marginTop:10}}>
            <span onClick={onClose} style={{color:C.faint,fontSize:10,fontFamily:C.mono,cursor:"pointer"}}>Skip for now</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Notifications Drawer ───────────────────────────────────────────────────
function NotifDrawer({user,token,onClose,onRead}) {
  const notes = [...(user.notifications||[])].reverse().slice(0,30);
  const markRead = async () => {
    try { await api.readNotes(token); onRead(); } catch{}
  };
  useEffect(()=>{ markRead(); },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:7000,background:"rgba(0,0,0,.8)",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:0,right:0,width:"min(380px,100vw)",height:"100vh",background:"rgba(12,8,32,.99)",borderLeft:`1px solid ${C.border}`,padding:20,overflowY:"auto",animation:"slideDown .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{color:C.text,fontFamily:C.mono,fontSize:13,fontWeight:700}}>🔔 NOTIFICATIONS</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.dim,fontSize:18,lineHeight:1}}>✕</button>
        </div>
        {notes.length===0 && <div style={{color:C.faint,fontFamily:C.mono,fontSize:11,textAlign:"center",padding:"40px 0"}}>No notifications yet</div>}
        {notes.map((n,i)=>(
          <div key={i} style={{padding:"12px 14px",background:n.read?"transparent":"rgba(167,139,250,.06)",border:`1px solid ${n.read?C.border:"rgba(167,139,250,.2)"}`,borderRadius:10,marginBottom:8}}>
            <div style={{color:n.type==="error"?C.red:n.type==="success"?C.green:n.type==="referral"?C.blue:C.text,fontSize:12,lineHeight:1.5,marginBottom:4}}>{n.message}</div>
            <div style={{color:C.faint,fontSize:9,fontFamily:C.mono}}>{timeAgo(n.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Logo ───────────────────────────────────────────────────────────────────
function Logo({sm=false}) {
  if(sm) return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:20}}>⛏️</span>
      <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:15,fontWeight:900,fontFamily:C.mono,letterSpacing:3}}>USDTMINE</div>
    </div>
  );
  return (
    <div style={{textAlign:"center",marginBottom:28}}>
      <div style={{fontSize:50,marginBottom:8,animation:"float 3s ease-in-out infinite"}}>⛏️</div>
      <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200%",fontSize:26,fontWeight:900,fontFamily:C.mono,letterSpacing:5,marginBottom:4}}>USDTMINE</div>
      <div style={{color:C.faint,fontSize:9,letterSpacing:4,fontFamily:C.mono}}>CRYPTO MINING PLATFORM</div>
    </div>
  );
}

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen({mode,onLogin,onSwitch}) {
  const [f,setF]=useState({name:"",email:"",pass:"",ref:""});
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  const isLogin = mode==="login";
  const params = new URLSearchParams(window.location.search);
  const urlRef = params.get("ref");

  useEffect(()=>{ if(urlRef&&!isLogin) setF(p=>({...p,ref:urlRef})); },[urlRef,isLogin]);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const data = isLogin
        ? await api.login({email:f.email,password:f.pass})
        : await api.register({name:f.name,email:f.email,password:f.pass,refCode:f.ref});
      onLogin(data);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <Logo/>
        <Card glow>
          <h2 style={{fontFamily:C.mono,color:C.text,fontSize:13,letterSpacing:2,marginBottom:20,textAlign:"center"}}>{isLogin?"SIGN IN TO YOUR ACCOUNT":"CREATE FREE ACCOUNT"}</h2>
          {err && (
            <div style={{color:C.red,fontSize:11,fontFamily:C.mono,marginBottom:14,padding:"10px 14px",background:"rgba(239,68,68,.08)",borderRadius:8,border:"1px solid rgba(239,68,68,.2)"}}>
              {err}
            </div>
          )}
          {!isLogin && <Input label="Full Name" value={f.name} onChange={set("name")} placeholder="Satoshi Nakamoto" icon="👤"/>}
          <Input label="Email Address" type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" icon="📧"/>
          <Input label="Password" type="password" value={f.pass} onChange={set("pass")} placeholder="Min 6 characters" icon="🔒"/>
          {!isLogin && <Input label="Referral Code (optional)" value={f.ref} onChange={set("ref")} placeholder="MINE-XXXX" icon="🎁"/>}
          <div onKeyDown={e=>e.key==="Enter"&&submit()}>
            <Btn onClick={submit} disabled={loading}>{loading?<Spinner size={16}/>:isLogin?"SIGN IN →":"CREATE ACCOUNT →"}</Btn>
          </div>
          <div style={{textAlign:"center",marginTop:16,color:C.dim,fontSize:12}}>
            {isLogin?"Don't have an account? ":"Already have an account? "}
            <span onClick={onSwitch} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>{isLogin?"Register free":"Sign in"}</span>
          </div>
        </Card>
        {!isLogin && (
          <div style={{marginTop:14,padding:14,background:"rgba(167,139,250,.05)",border:`1px solid ${C.border}`,borderRadius:12,textAlign:"center"}}>
            <div style={{color:C.accent,fontSize:9,fontFamily:C.mono,letterSpacing:2,marginBottom:4}}>🎁 REFERRAL BONUS</div>
            <div style={{color:C.dim,fontSize:11}}>Invite friends → earn 10% on every plan they activate!</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({user,setScreen}) {
  const plan = user.activePlan?.planId ? PLANS.find(p=>p.id===user.activePlan.planId) : null;
  const daysLeft = plan ? Math.max(0,Math.ceil((new Date(user.activePlan.expiresAt)-Date.now())/86400000)) : 0;
  const pct = plan ? Math.min(100,((plan.days-daysLeft)/plan.days)*100) : 0;

  return (
    <div style={{paddingBottom:20}}>
      {/* Balance card */}
      <Card grad glow style={{marginBottom:14,textAlign:"center",padding:"32px 20px"}}>
        <div style={{color:C.dim,fontSize:9,letterSpacing:3,fontFamily:C.mono,marginBottom:10}}>AVAILABLE BALANCE</div>
        <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:48,fontWeight:900,fontFamily:C.mono,lineHeight:1,marginBottom:8,animation:"glow 3s ease-in-out infinite"}}>
          ${fmt(user.balance)}
        </div>
        <div style={{color:C.faint,fontSize:11,fontFamily:C.mono,marginBottom:14}}>USDT</div>
        {plan ? (
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`rgba(52,211,153,.1)`,border:"1px solid rgba(52,211,153,.25)",borderRadius:20,padding:"6px 16px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
            <span style={{color:C.green,fontFamily:C.mono,fontSize:10,fontWeight:700}}>{plan.icon} {plan.name.toUpperCase()} ACTIVE — +${plan.daily}/DAY</span>
          </div>
        ):(
          <div style={{color:C.faint,fontSize:11,fontFamily:C.mono}}>No active plan</div>
        )}
      </Card>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[
          ["💰",`$${fmt(user.totalEarned)}`,"TOTAL EARNED"],
          ["👥",user.referrals?.length||0,"REFERRALS"],
          ["🎁",`$${fmt(user.refEarnings)}`,"REF BONUS"],
        ].map(([ic,v,l])=>(
          <Card key={l} style={{textAlign:"center",padding:"14px 8px"}}>
            <div style={{fontSize:18,marginBottom:6}}>{ic}</div>
            <div style={{color:C.accent,fontFamily:C.mono,fontSize:13,fontWeight:700,marginBottom:3}}>{v}</div>
            <div style={{color:C.faint,fontSize:7,letterSpacing:1.5,fontFamily:C.mono}}>{l}</div>
          </Card>
        ))}
      </div>

      {/* Mining progress or CTA */}
      {plan ? (
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <Lbl>MINING PROGRESS</Lbl>
            <Badge color={C.green}>DAY {plan.days-daysLeft}/{plan.days}</Badge>
          </div>
          <div style={{height:8,background:"rgba(167,139,250,.07)",borderRadius:4,overflow:"hidden",marginBottom:8}}>
            <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(${plan.grad})`,borderRadius:4,boxShadow:`0 0 12px rgba(167,139,250,.4)`,transition:"width .6s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:C.faint,fontSize:9,fontFamily:C.mono}}>{daysLeft} days remaining</span>
            <span style={{color:C.faint,fontSize:9,fontFamily:C.mono}}>≈${fmt4(plan.daily/24)}/hr</span>
          </div>
        </Card>
      ):(
        <Card style={{marginBottom:14,textAlign:"center",padding:"28px 20px",border:"1px solid rgba(167,139,250,.2)"}}>
          <div style={{fontSize:40,marginBottom:10}}>🚀</div>
          <div style={{color:C.text,fontSize:16,fontWeight:600,marginBottom:8}}>Start Mining USDT Today</div>
          <div style={{color:C.dim,fontSize:12,marginBottom:18,lineHeight:1.7}}>Choose a plan and start earning daily USDT rewards. Plans start from just $15!</div>
          <Btn onClick={()=>setScreen(SC.PLANS)}>VIEW MINING PLANS →</Btn>
        </Card>
      )}

      {/* Quick actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Btn variant="ghost" onClick={()=>setScreen(SC.WALLET)} style={{padding:"13px 10px",fontSize:10}}>💳 Wallet</Btn>
        <Btn variant="ghost" onClick={()=>setScreen(SC.REF)}    style={{padding:"13px 10px",fontSize:10}}>👥 Referrals</Btn>
      </div>
    </div>
  );
}

// ── Plans Screen ───────────────────────────────────────────────────────────
function PlansScreen({setScreen,setSelPlan,user}) {
  return (
    <div style={{paddingBottom:20}}>
      <h2 style={{fontFamily:C.mono,color:C.text,fontSize:15,letterSpacing:1,marginBottom:4}}>⛏ Mining Plans</h2>
      <p style={{color:C.dim,fontSize:12,marginBottom:18,lineHeight:1.5}}>7 levels · Daily USDT earnings · 30-day contracts</p>
      {PLANS.map((plan,i)=>(
        <Card key={plan.id} style={{marginBottom:12,border:`1px solid ${plan.color}20`,position:"relative",overflow:"hidden",padding:"18px 18px 18px 22px"}}>
          <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:`linear-gradient(${plan.grad})`}}/>
          {i===4 && <div style={{position:"absolute",top:14,right:14}}><Badge color={C.gold}>⭐ POPULAR</Badge></div>}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <span style={{fontSize:26}}>{plan.icon}</span>
            <div>
              <div style={{color:plan.color,fontFamily:C.mono,fontSize:13,fontWeight:700,letterSpacing:1}}>LVL {plan.id} — {plan.name.toUpperCase()}</div>
              <div style={{color:C.faint,fontSize:9,fontFamily:C.mono,marginTop:2}}>30-day contract · ${plan.daily*30} total return</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[["💰 INVEST",`$${plan.price}`],["📈 DAILY",`$${plan.daily}`]].map(([l,v])=>(
              <div key={l} style={{background:"rgba(167,139,250,.04)",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                <div style={{color:C.faint,fontSize:7,letterSpacing:2,fontFamily:C.mono,marginBottom:4}}>{l}</div>
                <div style={{color:plan.color,fontFamily:C.mono,fontSize:16,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:12,fontSize:10,color:C.dim,fontFamily:C.mono}}>
            Min withdraw: <span style={{color:C.text,fontWeight:700}}>${plan.minW}</span>
          </div>
          <Btn onClick={()=>{setSelPlan(plan);setScreen(SC.DEPOSIT);}} grad={plan.grad}>ACTIVATE — ${plan.price}</Btn>
        </Card>
      ))}
      <RefMini user={user} setScreen={setScreen}/>
    </div>
  );
}

// ── Referral Mini ──────────────────────────────────────────────────────────
function RefMini({user,setScreen}) {
  const [copied,setCopied]=useState(false);
const link = `${window.location.origin}?ref=${user.refCode}`;
  const copy = () => { try{navigator.clipboard.writeText(link);}catch{} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <Card style={{marginTop:14,border:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:22}}>👥</span>
        <div>
          <div style={{color:C.accent,fontFamily:C.mono,fontSize:11,fontWeight:700,letterSpacing:1}}>REFERRAL PROGRAM</div>
          <div style={{color:C.dim,fontSize:10,marginTop:2}}>Earn 10% on every friend's plan • {user.referrals?.length||0} referrals so far</div>
        </div>
      </div>
      <div style={{background:"rgba(167,139,250,.04)",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",marginBottom:10,fontFamily:C.mono,color:C.dim,fontSize:10,wordBreak:"break-all"}}>{link}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Btn onClick={copy} variant="ghost" size="sm">{copied?"✅ COPIED!":"📋 COPY LINK"}</Btn>
        {setScreen && <Btn onClick={()=>setScreen(SC.REF)} variant="outline" size="sm">VIEW ALL →</Btn>}
      </div>
    </Card>
  );
}

// ── Deposit Screen ─────────────────────────────────────────────────────────
function DepositScreen({plan,user,token,setScreen,showToast,refresh}) {
  const [currency,setCurrency]=useState("USDT");
  const [txHash,setTxHash]=useState("");
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(false);

  const copy = () => { try{navigator.clipboard.writeText(DEPOSIT_ADDRESS);}catch{} setCopied(true); setTimeout(()=>setCopied(false),2500); };

  const confirm = async () => {
    if(!txHash.trim()){showToast("Please paste your transaction hash","error");return;}
    setLoading(true);
    try {
      await api.deposit({planId:plan.id,currency,txHash:txHash.trim()},token);
      showToast("Deposit submitted! Admin will verify within 1-12 hours.");
      await refresh(); setScreen(SC.DASH);
    } catch(e) { showToast(e.message,"error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{paddingBottom:20}}>
      <button onClick={()=>setScreen(SC.PLANS)} style={{background:"none",border:"none",color:C.dim,fontFamily:C.mono,fontSize:10,letterSpacing:2,cursor:"pointer",marginBottom:16,padding:0,display:"flex",alignItems:"center",gap:6}}>
        ← BACK TO PLANS
      </button>

      <Card style={{marginBottom:14,border:`1px solid ${plan.color}33`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:plan.color,fontFamily:C.mono,fontSize:15,fontWeight:700}}>{plan.icon} {plan.name}</div>
            <div style={{color:C.dim,fontSize:10,fontFamily:C.mono,marginTop:3}}>+${plan.daily}/day × 30 days = ${plan.daily*30} total</div>
          </div>
          <div style={{background:`linear-gradient(${plan.grad})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontFamily:C.mono,fontSize:28,fontWeight:900}}>${plan.price}</div>
        </div>
      </Card>

      <Card style={{marginBottom:14}}>
        <Lbl>PAYMENT METHOD</Lbl>
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          {["USDT","TRX"].map(k=>(
            <button key={k} onClick={()=>setCurrency(k)} style={{flex:1,padding:"12px 8px",borderRadius:10,fontFamily:C.mono,fontSize:10,letterSpacing:1,fontWeight:700,border:`1px solid ${currency===k?C.accent:"rgba(167,139,250,.12)"}`,background:currency===k?"rgba(167,139,250,.1)":"transparent",color:currency===k?C.accent:C.dim,transition:"all .15s"}}>
              {k==="USDT"?"💵 USDT TRC-20":"🔵 TRX"}
            </button>
          ))}
        </div>

        <Lbl>SEND EXACTLY ${plan.price} TO THIS ADDRESS</Lbl>
        <div style={{background:"rgba(167,139,250,.05)",border:`1px solid rgba(167,139,250,.2)`,borderRadius:10,padding:"14px 16px",marginBottom:12,wordBreak:"break-all",fontFamily:C.mono,color:C.accent,fontSize:12,lineHeight:1.8}}>
          {DEPOSIT_ADDRESS}
        </div>
        <Btn onClick={copy} variant="ghost">{copied?"✅ ADDRESS COPIED!":"📋 COPY ADDRESS"}</Btn>

        <div style={{margin:"16px 0",padding:"14px",background:"rgba(167,139,250,.03)",borderRadius:10,border:`1px solid ${C.border}`,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:4}}>📱</div>
          <div style={{color:C.faint,fontSize:9,fontFamily:C.mono,letterSpacing:2}}>SCAN QR · TRON (TRC-20) NETWORK</div>
        </div>
      </Card>

      <Card style={{marginBottom:14}}>
        <Input label="Transaction Hash (TxID)" value={txHash} onChange={e=>setTxHash(e.target.value)}
          placeholder="Paste TX hash after sending..." icon="🔗"
          hint="Find the TX hash in your wallet after sending"/>
        <div style={{padding:"10px 14px",background:"rgba(251,191,36,.05)",border:"1px solid rgba(251,191,36,.15)",borderRadius:8,marginBottom:14}}>
          <div style={{color:"rgba(251,191,36,.8)",fontSize:9,fontFamily:C.mono,letterSpacing:1.5,marginBottom:4}}>⚠️ IMPORTANT</div>
          <div style={{color:C.dim,fontSize:11,lineHeight:1.7}}>
            • Send exactly <strong style={{color:C.text}}>${plan.price}</strong> — wrong amount may delay activation<br/>
            • Use TRC-20 (TRON) network only<br/>
            • Admin verifies within 1–12 hours
          </div>
        </div>
        <Btn onClick={confirm} disabled={loading} grad={plan.grad}>
          {loading?<Spinner size={16}/>:"✅ CONFIRM DEPOSIT"}
        </Btn>
      </Card>
    </div>
  );
}

// ── Wallet Screen ──────────────────────────────────────────────────────────
function WalletScreen({user,token,setScreen,showToast,refresh}) {
  const [address,setAddress]=useState(""); const [amount,setAmount]=useState(""); const [currency,setCurrency]=useState("USDT");
  const [deposits,setDeposits]=useState([]); const [withdrawals,setWithdrawals]=useState([]);
  const [loading,setLoading]=useState(false); const [txLoad,setTxLoad]=useState(true);
  const plan = user.activePlan?.planId ? PLANS.find(p=>p.id===user.activePlan.planId) : null;

  useEffect(()=>{
    Promise.all([api.getDeposits(token),api.getWithdrawals(token)])
      .then(([d,w])=>{setDeposits(d);setWithdrawals(w);})
      .catch(()=>{})
      .finally(()=>setTxLoad(false));
  },[token]);

  const doWithdraw = async () => {
    if(!address.trim()){showToast("Enter wallet address","error");return;}
    const amt = parseFloat(amount);
    if(!amt||amt<=0){showToast("Enter valid amount","error");return;}
    setLoading(true);
    try {
      await api.withdraw({amount:amt,address:address.trim(),currency},token);
      showToast("Withdrawal submitted! Processing within 24 hours.");
      await refresh(); setAmount(""); setAddress("");
      const [d,w]=await Promise.all([api.getDeposits(token),api.getWithdrawals(token)]);
      setDeposits(d); setWithdrawals(w);
    } catch(e){showToast(e.message,"error");}
    finally{setLoading(false);}
  };

  const allTx = [
    ...deposits.map(d=>({...d,kind:"Deposit",sign:"+",clr:C.green})),
    ...withdrawals.map(w=>({...w,kind:"Withdraw",sign:"-",clr:C.red})),
  ].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  return (
    <div style={{paddingBottom:20}}>
      <h2 style={{fontFamily:C.mono,color:C.text,fontSize:15,letterSpacing:1,marginBottom:18}}>💳 Wallet</h2>

      <Card grad glow style={{marginBottom:14,textAlign:"center",padding:"26px 20px"}}>
        <div style={{color:C.dim,fontSize:9,letterSpacing:3,fontFamily:C.mono,marginBottom:8}}>AVAILABLE BALANCE</div>
        <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:44,fontWeight:900,fontFamily:C.mono,marginBottom:6}}>${fmt(user.balance)}</div>
        {plan && <div style={{color:C.faint,fontSize:10,fontFamily:C.mono}}>Min withdrawal: ${plan.minW}</div>}
      </Card>

      <Card style={{marginBottom:14}}>
        <h3 style={{fontFamily:C.mono,color:C.text,fontSize:11,letterSpacing:2,marginBottom:16}}>WITHDRAW FUNDS</h3>
        <Lbl>NETWORK</Lbl>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["USDT","TRX"].map(k=>(
            <button key={k} onClick={()=>setCurrency(k)} style={{flex:1,padding:"11px 8px",borderRadius:10,fontFamily:C.mono,fontSize:10,letterSpacing:1,fontWeight:700,border:`1px solid ${currency===k?C.accent:"rgba(167,139,250,.12)"}`,background:currency===k?"rgba(167,139,250,.1)":"transparent",color:currency===k?C.accent:C.dim,transition:"all .15s"}}>
              {k==="USDT"?"💵 USDT TRC-20":"🔵 TRX"}
            </button>
          ))}
        </div>
        <Input label="Wallet Address" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Your TRC-20 address..." icon="💳"/>
        <Input label="Amount (USDT)" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" icon="💰"/>
        {!plan && (
          <div style={{color:C.red,fontSize:10,fontFamily:C.mono,marginBottom:12,padding:"8px 12px",background:"rgba(239,68,68,.07)",borderRadius:8}}>
            ⚠️ You need an active mining plan to withdraw
          </div>
        )}
        <Btn onClick={doWithdraw} disabled={loading||!plan}>
          {loading?<Spinner size={16}/>:"WITHDRAW FUNDS"}
        </Btn>
      </Card>

      <Card>
        <h3 style={{fontFamily:C.mono,color:C.text,fontSize:11,letterSpacing:2,marginBottom:14}}>TRANSACTION HISTORY</h3>
        {txLoad && <div style={{textAlign:"center",padding:20}}><Spinner/></div>}
        {!txLoad && allTx.length===0 && <div style={{color:C.faint,fontSize:11,fontFamily:C.mono,textAlign:"center",padding:"16px 0"}}>No transactions yet</div>}
        {allTx.map((tx,i)=>(
          <div key={tx._id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid rgba(167,139,250,.05)"}}>
            <div>
              <div style={{color:C.text,fontSize:12,fontWeight:500}}>{tx.kind}{tx.planName?` · ${tx.planName}`:""}</div>
              <div style={{color:C.faint,fontSize:9,fontFamily:C.mono,marginTop:3}}>{timeAgo(tx.createdAt)}</div>
            </div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <div style={{color:tx.clr,fontFamily:C.mono,fontSize:13,fontWeight:700}}>{tx.sign}${fmt(tx.amount)}</div>
              <StatusBadge s={tx.status}/>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Referral Screen ────────────────────────────────────────────────────────
function RefScreen({user,token,showToast}) {
  const [data,setData]=useState({referrals:[],earnings:0,code:user.refCode,total:0});
  const [loading,setLoading]=useState(true);
  const [copied,setCopied]=useState(false);
  const link = `${window.location.origin}?ref=${user.refCode}`;

  useEffect(()=>{ api.getReferrals(token).then(setData).catch(()=>{}).finally(()=>setLoading(false)); },[token]);

  const copy = () => { try{navigator.clipboard.writeText(link);}catch{} setCopied(true); setTimeout(()=>setCopied(false),2500); showToast("Referral link copied!"); };

  return (
    <div style={{paddingBottom:20}}>
      <h2 style={{fontFamily:C.mono,color:C.text,fontSize:15,letterSpacing:1,marginBottom:18}}>👥 Referrals</h2>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[["👥",data.total,"REFS"],["💰",`$${fmt(data.earnings)}`,"EARNED"],["📊","10%","RATE"]].map(([ic,v,l])=>(
          <Card key={l} style={{textAlign:"center",padding:"14px 8px"}}>
            <div style={{fontSize:18,marginBottom:6}}>{ic}</div>
            <div style={{color:C.accent,fontFamily:C.mono,fontSize:13,fontWeight:700,marginBottom:3}}>{v}</div>
            <div style={{color:C.faint,fontSize:7,letterSpacing:1.5,fontFamily:C.mono}}>{l}</div>
          </Card>
        ))}
      </div>

      {/* Free plan offers */}
      <Card style={{marginBottom:14,background:"linear-gradient(135deg,rgba(76,29,149,.3),rgba(12,8,32,.98))",border:"1px solid rgba(167,139,250,.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <span style={{color:C.gold,fontFamily:C.mono,fontSize:10,letterSpacing:2,fontWeight:700}}>🎁 FREE PLAN OFFERS</span>
          <Badge color={C.gold}>30 DAYS</Badge>
        </div>
        {[{t:20,r:"🌱 Starter Plan FREE",c:C.accent},{t:2,r:"⚡ Basic Plan FREE",c:C.blue}].map((o,i)=>{
          const prog=Math.min(data.total,o.t); const pct=Math.min(100,(prog/o.t)*100);
          return (
            <div key={i} style={{marginBottom:i===0?12:0,padding:14,background:"rgba(167,139,250,.04)",borderRadius:10,border:`1px solid ${o.c}18`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{color:o.c,fontFamily:C.mono,fontSize:11,fontWeight:700}}>Invite {o.t} → {o.r}</span>
                <span style={{color:o.c,fontFamily:C.mono,fontSize:10,fontWeight:700}}>{prog}/{o.t}</span>
              </div>
              <div style={{height:5,background:"rgba(167,139,250,.07)",borderRadius:3}}>
                <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${o.c}66,${o.c})`,borderRadius:3,transition:"width .5s"}}/>
              </div>
              <div style={{color:C.faint,fontSize:9,fontFamily:C.mono,marginTop:5}}>{Math.max(0,o.t-prog)} more referrals needed</div>
            </div>
          );
        })}
      </Card>

      {/* Ref code */}
      <Card style={{marginBottom:14}}>
        <Lbl>YOUR REFERRAL CODE</Lbl>
        <div style={{background:"rgba(167,139,250,.06)",border:`1px solid rgba(167,139,250,.2)`,borderRadius:10,padding:"14px 18px",marginBottom:14,fontFamily:C.mono,color:C.accent,fontSize:22,fontWeight:700,letterSpacing:6,textAlign:"center"}}>{user.refCode}</div>
        <Lbl>REFERRAL LINK</Lbl>
        <div style={{background:"rgba(167,139,250,.03)",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 13px",marginBottom:12,fontFamily:C.mono,color:C.dim,fontSize:10,wordBreak:"break-all"}}>{link}</div>
        <Btn onClick={copy}>{copied?"✅ LINK COPIED!":"📋 COPY REFERRAL LINK"}</Btn>
      </Card>

      {/* How it works */}
      <Card style={{marginBottom:14}}>
        <h3 style={{fontFamily:C.mono,color:C.text,fontSize:11,letterSpacing:3,marginBottom:14}}>HOW IT WORKS</h3>
        {[["01","Share your link","#a78bfa"],["02","Friend registers & activates a plan","#60a5fa"],["03","You earn 10% of their plan price instantly","#34d399"],["04","Unlimited referrals — no limit!","#fbbf24"]].map(([n,t,c])=>(
          <div key={n} style={{display:"flex",gap:14,padding:"10px 0",borderBottom:"1px solid rgba(167,139,250,.05)",alignItems:"flex-start"}}>
            <span style={{color:c,fontFamily:C.mono,fontSize:13,fontWeight:900,minWidth:24}}>{n}</span>
            <span style={{color:C.dim,fontSize:12,lineHeight:1.5}}>{t}</span>
          </div>
        ))}
      </Card>

      {/* List */}
      <Card>
        <h3 style={{fontFamily:C.mono,color:C.text,fontSize:11,letterSpacing:3,marginBottom:14}}>MY REFERRALS ({data.total})</h3>
        {loading && <div style={{textAlign:"center",padding:16}}><Spinner/></div>}
        {!loading && data.referrals.length===0 && <div style={{color:C.faint,fontSize:11,fontFamily:C.mono,textAlign:"center",padding:"14px 0"}}>No referrals yet. Share your link!</div>}
        {data.referrals.map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid rgba(167,139,250,.05)"}}>
            <div>
              <div style={{color:C.text,fontSize:12,fontWeight:500}}>{r.name}</div>
              <div style={{color:C.faint,fontSize:9,fontFamily:C.mono,marginTop:2}}>{r.email} · {timeAgo(r.joinedAt)}</div>
            </div>
            {r.activePlan ? <Badge color={C.green}>{r.activePlan}</Badge> : <Badge color={C.faint}>No plan</Badge>}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────
function BottomNav({screen,setScreen,unread,onNotif,onLogout}) {
  const tabs=[
    {id:SC.DASH,  ic:"🏠",lb:"Home"},
    {id:SC.PLANS, ic:"⛏",lb:"Plans"},
    {id:SC.WALLET,ic:"💳",lb:"Wallet"},
    {id:SC.REF,   ic:"👥",lb:"Refer"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"rgba(6,4,18,.98)",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-around",padding:"8px 0 max(12px,env(safe-area-inset-bottom))",backdropFilter:"blur(20px)"}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setScreen(t.id)} style={{background:"none",border:"none",padding:"4px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,opacity:screen===t.id?1:.3,transition:"opacity .2s",minWidth:44}}>
          <span style={{fontSize:18}}>{t.ic}</span>
          <span style={{color:screen===t.id?C.accent:C.dim,fontSize:7,letterSpacing:1.5,fontFamily:C.mono,fontWeight:700}}>{t.lb}</span>
          {screen===t.id && <div style={{width:4,height:4,borderRadius:"50%",background:C.accent}}/>}
        </button>
      ))}
      <button onClick={onNotif} style={{background:"none",border:"none",padding:"4px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,opacity:.6,position:"relative",minWidth:44}}>
        <span style={{fontSize:18}}>🔔</span>
        {unread>0 && <div style={{position:"absolute",top:2,right:8,width:8,height:8,borderRadius:"50%",background:C.red,animation:"ping 1s infinite"}}/>}
        <span style={{color:C.dim,fontSize:7,letterSpacing:1.5,fontFamily:C.mono}}>ALERTS</span>
      </button>
      <button onClick={onLogout} style={{background:"none",border:"none",padding:"4px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,opacity:.3,minWidth:44}}>
        <span style={{fontSize:18}}>🚪</span>
        <span style={{color:C.dim,fontSize:7,letterSpacing:1.5,fontFamily:C.mono}}>EXIT</span>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen]   = useState(SC.LOGIN);
  const [user,setUser]       = useState(null);
  const [token,setToken]     = useState(()=>localStorage.getItem("um_token")||"");
  const [selPlan,setSelPlan] = useState(null);
  const [toast,setToast]     = useState({msg:"",type:"success"});
  const [welcome,setWelcome] = useState(false);
  const [notifOpen,setNotifOpen] = useState(false);
  const [showAdmin,setShowAdmin] = useState(false);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast({msg:"",type:"success"}),3500); };

  const unread = user?.notifications?.filter(n=>!n.read).length || 0;

  // Auto-login
  useEffect(()=>{
    if(!token) return;
    api.me(token).then(u=>{ setUser(u); setScreen(SC.DASH); }).catch(()=>{ localStorage.removeItem("um_token"); setToken(""); });
  },[]);

  // Admin shortcut via URL hash
  useEffect(()=>{
    const check = () => setShowAdmin(window.location.hash==="#admin");
    check();
    window.addEventListener("hashchange",check);
    return () => window.removeEventListener("hashchange",check);
  },[]);

  // Auto-switch to register if ?ref= in URL
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if(params.get("ref") && !token) setScreen(SC.REG);
  },[]);

  const refresh = useCallback(async()=>{
    if(!token) return;
    try { const u = await api.me(token); setUser(u); } catch{}
  },[token]);

  // Poll balance every 30s
  useEffect(()=>{
    if(!token||!user) return;
    const t = setInterval(refresh,30000);
    return ()=>clearInterval(t);
  },[token,user,refresh]);

  const handleLogin = ({token:t,user:u}) => {
    localStorage.setItem("um_token",t);
    setToken(t); setUser(u); setScreen(SC.DASH);
    if(u.showWelcome) setWelcome(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("um_token");
    setToken(""); setUser(null); setScreen(SC.LOGIN); setWelcome(false);
  };

  if(showAdmin) return <AdminPanel onExit={()=>{ setShowAdmin(false); window.location.hash=""; }}/>;

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at top,#160830 0%,#060412 65%)"}}>
      <Particles/>
      <Toast msg={toast.msg} type={toast.type}/>
      {welcome && user && <WelcomeModal user={user} onClose={()=>setWelcome(false)}/>}
      {notifOpen && user && <NotifDrawer user={user} token={token} onClose={()=>setNotifOpen(false)} onRead={refresh}/>}

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:680,margin:"0 auto",padding:user?"16px 16px 100px":"0 16px"}}>
        {!user && (
          <>
            {screen===SC.LOGIN && <AuthScreen mode="login"    onLogin={handleLogin} onSwitch={()=>setScreen(SC.REG)}/>}
            {screen===SC.REG   && <AuthScreen mode="register" onLogin={handleLogin} onSwitch={()=>setScreen(SC.LOGIN)}/>}
          </>
        )}

        {user && (
          <>
            {screen!==SC.DEPOSIT && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,marginBottom:20}}>
                <Logo sm/>
                <div style={{textAlign:"right"}}>
                  <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:16,fontFamily:C.mono,fontWeight:700}}>${fmt(user.balance)}</div>
                  <div style={{color:C.faint,fontSize:9,fontFamily:C.mono,marginTop:2}}>{user.name}</div>
                </div>
              </div>
            )}
            {screen===SC.DASH    && <Dashboard  user={user} setScreen={setScreen}/>}
            {screen===SC.PLANS   && <PlansScreen setScreen={setScreen} setSelPlan={setSelPlan} user={user}/>}
            {screen===SC.DEPOSIT && selPlan && <DepositScreen plan={selPlan} user={user} token={token} setScreen={setScreen} showToast={showToast} refresh={refresh}/>}
            {screen===SC.WALLET  && <WalletScreen user={user} token={token} setScreen={setScreen} showToast={showToast} refresh={refresh}/>}
            {screen===SC.REF     && <RefScreen user={user} token={token} showToast={showToast}/>}
            {screen!==SC.DEPOSIT && <BottomNav screen={screen} setScreen={setScreen} unread={unread} onNotif={()=>setNotifOpen(true)} onLogout={handleLogout}/>}
          </>
        )}
      </div>
    </div>
  );
}
