import { useState, useEffect, useCallback, useRef } from "react";
import { api, PLANS, fmt, timeAgo } from "./api.js";

const A = {
  bg:"#04020f", card:"rgba(8,5,22,.98)", border:"rgba(167,139,250,.12)",
  accent:"#a78bfa", blue:"#60a5fa", gold:"#fbbf24",
  text:"#e2e8f0", dim:"rgba(226,232,240,.45)", faint:"rgba(226,232,240,.15)",
  green:"#34d399", red:"#f87171", orange:"#fb923c",
  mono:"'Space Mono',monospace",
};

// ── Primitives ────────────────────────────────────────────────
function ACard({children,style={}}){
  return <div style={{background:A.card,border:`1px solid ${A.border}`,borderRadius:12,padding:16,backdropFilter:"blur(20px)",...style}}>{children}</div>;
}
function ALbl({children,c=A.accent}){
  return <div style={{color:c,fontSize:8,letterSpacing:2.5,textTransform:"uppercase",fontFamily:A.mono,marginBottom:6,fontWeight:700}}>{children}</div>;
}
function ABtn({children,onClick,disabled,c="primary",style={}}){
  const [h,setH]=useState(false);
  const bg={primary:"linear-gradient(135deg,#7c3aed,#a78bfa)",green:"linear-gradient(135deg,#059669,#34d399)",red:"linear-gradient(135deg,#dc2626,#ef4444)",ghost:"rgba(167,139,250,.08)",orange:"linear-gradient(135deg,#c2410c,#fb923c)",blue:"linear-gradient(135deg,#1d4ed8,#60a5fa)"}[c]||"rgba(167,139,250,.08)";
  return(
    <button onClick={onClick} disabled={disabled} onMouseOver={()=>setH(true)} onMouseOut={()=>setH(false)}
      style={{padding:"8px 14px",borderRadius:8,border:"none",background:bg,color:"#fff",fontFamily:A.mono,fontSize:9,letterSpacing:1.5,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.4:1,transition:"all .15s",transform:h&&!disabled?"translateY(-1px)":"translateY(0)",boxShadow:h&&!disabled?"0 4px 16px rgba(124,58,237,.3)":"none",...style}}>
      {children}
    </button>
  );
}
function AInput({placeholder,value,onChange,type="text",style={}}){
  const [f,setF]=useState(false);
  return(
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:f?"rgba(167,139,250,.07)":"rgba(255,255,255,.02)",border:`1px solid ${f?"rgba(167,139,250,.4)":A.border}`,borderRadius:8,padding:"9px 13px",color:A.text,fontFamily:A.mono,fontSize:11,outline:"none",transition:"all .2s",...style}}
    />
  );
}
function ATag({children,c=A.accent}){
  return <span style={{background:`${c}18`,border:`1px solid ${c}30`,color:c,fontSize:8,letterSpacing:1.5,padding:"2px 8px",borderRadius:5,fontFamily:A.mono,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
}
function StatBadge({s}){
  const m={pending:[A.gold,"PENDING"],approved:[A.green,"APPROVED"],completed:[A.green,"DONE"],rejected:[A.red,"REJECTED"],processing:[A.blue,"PROCESSING"]};
  const [c,l]=m[s]||[A.faint,(s||"").toUpperCase()];
  return <ATag c={c}>{l}</ATag>;
}
function Spin(){
  return <div style={{width:16,height:16,border:"2px solid rgba(167,139,250,.2)",borderTop:"2px solid #a78bfa",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>;
}

// ── Active Indicator ──────────────────────────────────────────
function ActiveDot({lastActive}){
  if(!lastActive) return <ATag c={A.faint}>NEVER</ATag>;
  const mins=Math.floor((Date.now()-new Date(lastActive))/60000);
  if(mins<5) return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:A.green,animation:"pulse 1.5s infinite",display:"inline-block"}}/>
      <span style={{color:A.green,fontSize:8,fontFamily:A.mono,fontWeight:700}}>ONLINE</span>
    </span>
  );
  if(mins<60) return <span style={{color:A.gold,fontSize:8,fontFamily:A.mono}}>{mins}m ago</span>;
  if(mins<1440) return <span style={{color:A.dim,fontSize:8,fontFamily:A.mono}}>{Math.floor(mins/60)}h ago</span>;
  return <span style={{color:A.faint,fontSize:8,fontFamily:A.mono}}>{Math.floor(mins/1440)}d ago</span>;
}

// ── Admin Login ───────────────────────────────────────────────
function AdminLogin({onAuth,onBack}){
  const [key,setKey]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async()=>{
    if(!key.trim()){setErr("Enter admin key");return;}
    setLoading(true); setErr("");
    try{ await api.aStats(key.trim()); onAuth(key.trim()); }
    catch{ setErr("Wrong admin key"); }
    finally{ setLoading(false); }
  };
  return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at top,#160830,${A.bg})`,display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:A.mono}}>
      <div style={{width:"100%",maxWidth:380,animation:"fadeUp .4s ease"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:10}}>🔐</div>
          <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:22,fontWeight:900,letterSpacing:4}}>ADMIN PANEL</div>
          <div style={{color:A.faint,fontSize:9,letterSpacing:3,marginTop:4}}>USDTMINE CONTROL CENTER</div>
        </div>
        <ACard>
          {err&&<div style={{color:A.red,fontSize:10,marginBottom:12,padding:"8px 12px",background:"rgba(239,68,68,.08)",borderRadius:8,border:"1px solid rgba(239,68,68,.2)"}}>{err}</div>}
          <ALbl>ADMIN KEY</ALbl>
          <AInput type="password" placeholder="Enter your admin key..." value={key} onChange={e=>setKey(e.target.value)} style={{width:"100%",marginBottom:14}}/>
          <ABtn c="primary" onClick={submit} disabled={loading} style={{width:"100%",padding:"12px"}}>{loading?<Spin/>:"ACCESS ADMIN →"}</ABtn>
          <div style={{textAlign:"center",marginTop:12}}>
            <span onClick={onBack} style={{color:A.faint,fontSize:9,cursor:"pointer"}}>← Back to site</span>
          </div>
        </ACard>
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────
function StatsBar({stats}){
  if(!stats) return null;
  const items=[
    ["👥","Users",stats.totalUsers,A.accent],
    ["💰","Revenue",`$${fmt(stats.revenue)}`,A.green],
    ["🟢","Online Now",stats.onlineCount||0,A.green],
    ["⏳","Dep. Pending",stats.pendingDeps,A.gold],
    ["⏳","W/D Pending",stats.pendingWDs,A.orange],
    ["💬","Chat Unread",stats.unreadChats||0,A.blue],
    ["✅","Approved Deps",stats.approvedDeps,A.blue],
    ["💎","Total Balance",`$${fmt(stats.totalBalance)}`,A.accent],
  ];
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
      {items.map(([ic,lb,vl,c])=>(
        <ACard key={lb} style={{padding:"10px 8px",textAlign:"center"}}>
          <div style={{fontSize:14,marginBottom:3}}>{ic}</div>
          <div style={{color:c,fontFamily:A.mono,fontSize:12,fontWeight:700,marginBottom:2}}>{vl}</div>
          <div style={{color:A.faint,fontSize:7,letterSpacing:1.5}}>{lb.toUpperCase()}</div>
        </ACard>
      ))}
    </div>
  );
}

// ── Deposits Tab ──────────────────────────────────────────────
function DepositsTab({adminKey,onMsg,onRefreshStats}){
  const [deps,setDeps]=useState([]); const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("pending"); const [actionId,setActionId]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{setDeps(await api.aDeposits(adminKey,filter));}catch(e){onMsg(e.message,"err");}
    finally{setLoading(false);}
  },[adminKey,filter]);

  useEffect(()=>{ load(); },[load]);

  const approve=async(id)=>{
    setActionId(id);
    try{const r=await api.aApprove(adminKey,id);onMsg(r.message);load();onRefreshStats();}
    catch(e){onMsg(e.message,"err");}
    finally{setActionId(null);}
  };
  const reject=async(id)=>{
    const note=window.prompt("Rejection reason (optional):")||"";
    setActionId(id);
    try{await api.aReject(adminKey,id,note);onMsg("Deposit rejected");load();onRefreshStats();}
    catch(e){onMsg(e.message,"err");}
    finally{setActionId(null);}
  };

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["pending","approved","rejected","all"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${filter===f?A.accent:A.border}`,background:filter===f?"rgba(167,139,250,.15)":"transparent",color:filter===f?A.accent:A.dim,fontFamily:A.mono,fontSize:9,letterSpacing:1.5,cursor:"pointer",textTransform:"uppercase"}}>{f}</button>
        ))}
        <button onClick={load} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${A.border}`,background:"transparent",color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",marginLeft:"auto"}}>🔄</button>
      </div>
      {loading&&<div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading&&deps.length===0&&<div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No {filter} deposits</div>}
      {deps.map(d=>(
        <ACard key={d._id} style={{marginBottom:10,border:`1px solid ${d.status==="pending"?"rgba(251,191,36,.2)":A.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{color:A.text,fontSize:12,fontWeight:600,marginBottom:2}}>{d.userId?.name||"Unknown"}</div>
              <div style={{color:A.dim,fontSize:9,fontFamily:A.mono}}>{d.userId?.email}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <StatBadge s={d.status}/>
              <ATag c={A.blue}>{d.planName}</ATag>
              {d.bonusPct>0&&<ATag c={A.gold}>+{d.bonusPct}% BONUS</ATag>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
            {[["Amount",`$${d.amount}`],["Currency",d.currency],["Date",timeAgo(d.createdAt)]].map(([l,v])=>(
              <div key={l} style={{background:"rgba(167,139,250,.04)",borderRadius:7,padding:"8px 10px"}}>
                <div style={{color:A.faint,fontSize:7,letterSpacing:1.5,fontFamily:A.mono,marginBottom:3}}>{l}</div>
                <div style={{color:A.text,fontFamily:A.mono,fontSize:10,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          {d.bonus>0&&(
            <div style={{marginBottom:10,padding:"6px 10px",background:"rgba(251,191,36,.08)",borderRadius:7,border:"1px solid rgba(251,191,36,.2)"}}>
              <span style={{color:A.gold,fontSize:9,fontFamily:A.mono}}>🎁 Bonus: +${fmt(d.bonus)} ({d.bonusPct}%) credited on approval</span>
            </div>
          )}
          <div style={{marginBottom:10}}>
            <div style={{color:A.faint,fontSize:8,fontFamily:A.mono,letterSpacing:1.5,marginBottom:4}}>TX HASH</div>
            <div style={{background:"rgba(167,139,250,.04)",border:`1px solid ${A.border}`,borderRadius:7,padding:"8px 10px",fontFamily:A.mono,color:A.accent,fontSize:9,wordBreak:"break-all",lineHeight:1.7}}>{d.txHash}</div>
          </div>
          {d.adminNote&&<div style={{marginBottom:10,color:A.red,fontSize:10,fontFamily:A.mono}}>Note: {d.adminNote}</div>}
          {d.status==="pending"&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <ABtn c="green" onClick={()=>approve(d._id)} disabled={actionId===d._id}>{actionId===d._id?<Spin/>:"✅ APPROVE"}</ABtn>
              <ABtn c="red"   onClick={()=>reject(d._id)}  disabled={actionId===d._id}>❌ REJECT</ABtn>
              <a href={`https://tronscan.org/#/transaction/${d.txHash}`} target="_blank" rel="noreferrer">
                <ABtn c="ghost" style={{color:A.blue}}>🔍 VERIFY TX</ABtn>
              </a>
            </div>
          )}
        </ACard>
      ))}
    </div>
  );
}

// ── Withdrawals Tab ───────────────────────────────────────────
function WithdrawalsTab({adminKey,onMsg,onRefreshStats}){
  const [wds,setWds]=useState([]); const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("pending"); const [actionId,setActionId]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{setWds(await api.aWithdrawals(adminKey,filter));}catch(e){onMsg(e.message,"err");}
    finally{setLoading(false);}
  },[adminKey,filter]);

  useEffect(()=>{ load(); },[load]);

  const complete=async(id)=>{
    const tx=window.prompt("Enter TxHash of sent payment (optional):")||"";
    setActionId(id);
    try{await api.aCompleteW(adminKey,id,tx);onMsg("✅ Withdrawal completed!");load();onRefreshStats();}
    catch(e){onMsg(e.message,"err");}
    finally{setActionId(null);}
  };
  const reject=async(id,amount)=>{
    const note=window.prompt("Rejection reason:")||"";
    setActionId(id);
    try{await api.aRejectW(adminKey,id,note);onMsg(`Rejected. $${amount} refunded.`);load();onRefreshStats();}
    catch(e){onMsg(e.message,"err");}
    finally{setActionId(null);}
  };

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["pending","completed","rejected","all"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${filter===f?A.accent:A.border}`,background:filter===f?"rgba(167,139,250,.15)":"transparent",color:filter===f?A.accent:A.dim,fontFamily:A.mono,fontSize:9,letterSpacing:1.5,cursor:"pointer",textTransform:"uppercase"}}>{f}</button>
        ))}
        <button onClick={load} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${A.border}`,background:"transparent",color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",marginLeft:"auto"}}>🔄</button>
      </div>
      {loading&&<div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading&&wds.length===0&&<div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No {filter} withdrawals</div>}
      {wds.map(w=>(
        <ACard key={w._id} style={{marginBottom:10,border:`1px solid ${w.status==="pending"?"rgba(251,191,36,.2)":A.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{color:A.text,fontSize:12,fontWeight:600,marginBottom:2}}>{w.userId?.name||"Unknown"}</div>
              <div style={{color:A.dim,fontSize:9,fontFamily:A.mono}}>{w.userId?.email}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <StatBadge s={w.status}/>
              <div style={{color:A.red,fontFamily:A.mono,fontSize:14,fontWeight:900}}>-${fmt(w.amount)}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:10}}>
            {[["Currency",w.currency],["Date",timeAgo(w.createdAt)]].map(([l,v])=>(
              <div key={l} style={{background:"rgba(167,139,250,.04)",borderRadius:7,padding:"8px 10px"}}>
                <div style={{color:A.faint,fontSize:7,letterSpacing:1.5,fontFamily:A.mono,marginBottom:3}}>{l}</div>
                <div style={{color:A.text,fontFamily:A.mono,fontSize:10,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:10}}>
            <div style={{color:A.faint,fontSize:8,fontFamily:A.mono,letterSpacing:1.5,marginBottom:4}}>SEND TO ADDRESS</div>
            <div style={{background:"rgba(167,139,250,.04)",border:`1px solid ${A.border}`,borderRadius:7,padding:"8px 10px",fontFamily:A.mono,color:A.accent,fontSize:10,wordBreak:"break-all"}}>{w.address}</div>
          </div>
          {w.txHash&&<div style={{color:A.green,fontSize:9,fontFamily:A.mono,marginBottom:10}}>TX: {w.txHash}</div>}
          {w.adminNote&&<div style={{color:A.red,fontSize:10,fontFamily:A.mono,marginBottom:10}}>Note: {w.adminNote}</div>}
          {w.status==="pending"&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <ABtn c="green" onClick={()=>complete(w._id)} disabled={actionId===w._id}>{actionId===w._id?<Spin/>:"✅ MARK SENT"}</ABtn>
              <ABtn c="red"   onClick={()=>reject(w._id,w.amount)} disabled={actionId===w._id}>❌ REJECT & REFUND</ABtn>
            </div>
          )}
        </ACard>
      ))}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────
function UsersTab({adminKey,onMsg,onRefreshStats}){
  const [users,setUsers]=useState([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(""); const [actionId,setActionId]=useState(null);
  const [expandId,setExpandId]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{setUsers(await api.aUsers(adminKey,search));}catch(e){onMsg(e.message,"err");}
    finally{setLoading(false);}
  },[adminKey,search]);

  useEffect(()=>{ const t=setTimeout(load,400); return()=>clearTimeout(t); },[load]);

  const block=async(id)=>{
    setActionId(id);
    try{const r=await api.aBlock(adminKey,id);onMsg(r.message);load();}
    catch(e){onMsg(e.message,"err");}finally{setActionId(null);}
  };
  const adjustBal=async(id,name)=>{
    const v=window.prompt(`Adjust balance for ${name}\n(+10 to add, -10 to subtract):`);
    if(!v||isNaN(parseFloat(v))) return;
    setActionId(id);
    try{const r=await api.aAdjustBal(adminKey,id,parseFloat(v));onMsg(r.message);load();onRefreshStats();}
    catch(e){onMsg(e.message,"err");}finally{setActionId(null);}
  };
  const sendMoney=async(id,name)=>{
    const v=window.prompt(`Send money to ${name}:\nEnter amount to add:`);
    if(!v||isNaN(parseFloat(v))||parseFloat(v)<=0) return;
    const note=window.prompt("Optional note for user (or press Cancel):")||"";
    setActionId(id);
    try{const r=await api.aSendMoney(adminKey,id,parseFloat(v),note);onMsg(r.message);load();onRefreshStats();}
    catch(e){onMsg(e.message,"err");}finally{setActionId(null);}
  };
  const setPlan=async(id,name)=>{
    const planNames=PLANS.map(p=>`${p.id}. ${p.icon} ${p.name} ($${p.price})`).join("\n");
    const v=window.prompt(`Set plan for ${name}:\n${planNames}\n\nEnter plan number (1-7):`);
    if(!v||isNaN(parseInt(v))) return;
    setActionId(id);
    try{const r=await api.aSetPlan(adminKey,id,parseInt(v));onMsg(r.message);load();onRefreshStats();}
    catch(e){onMsg(e.message,"err");}finally{setActionId(null);}
  };
  const removePlan=async(id,name)=>{
    if(!window.confirm(`Remove plan from ${name}?`)) return;
    setActionId(id);
    try{await api.aRemovePlan(adminKey,id);onMsg("Plan removed");load();}
    catch(e){onMsg(e.message,"err");}finally{setActionId(null);}
  };
  const notifyUser=async(id,name)=>{
    const m=window.prompt(`Send notification to ${name}:`);
    if(!m?.trim()) return;
    setActionId(id);
    try{await api.aNotifyUser(adminKey,id,m,"info");onMsg("Notification sent!");}
    catch(e){onMsg(e.message,"err");}finally{setActionId(null);}
  };

  return(
    <div>
      <div style={{marginBottom:14}}>
        <AInput placeholder="🔍 Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%"}}/>
      </div>
      {loading&&<div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading&&users.length===0&&<div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No users found</div>}
      {users.map(u=>{
        const plan=u.activePlan?.planId?PLANS.find(p=>p.id===u.activePlan.planId):null;
        const isExp=expandId===u._id;
        return(
          <ACard key={u._id} style={{marginBottom:10,border:`1px solid ${u.isBlocked?"rgba(239,68,68,.2)":A.border}`,cursor:"pointer"}} onClick={()=>setExpandId(isExp?null:u._id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <div style={{color:A.text,fontSize:12,fontWeight:600}}>{u.name}</div>
                  {u.isBlocked&&<ATag c={A.red}>BLOCKED</ATag>}
                  {plan&&<ATag c={plan.color}>{plan.icon} {plan.name}</ATag>}
                  {!plan&&<ATag c={A.faint}>NO PLAN</ATag>}
                </div>
                <div style={{color:A.dim,fontSize:9,fontFamily:A.mono,marginBottom:4}}>{u.email}</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{color:A.green,fontFamily:A.mono,fontSize:10,fontWeight:700}}>💰 ${fmt(u.balance)}</span>
                  <span style={{color:A.dim,fontFamily:A.mono,fontSize:9}}>👥 {u.referrals?.length||0} refs</span>
                  <span style={{color:A.dim,fontFamily:A.mono,fontSize:9}}>📅 {timeAgo(u.createdAt)}</span>
                  {/* LAST ACTIVE */}
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                    <span style={{color:A.faint,fontSize:8,fontFamily:A.mono}}>LAST:</span>
                    <ActiveDot lastActive={u.lastActive}/>
                  </span>
                </div>
              </div>
              <span style={{color:A.faint,fontSize:12,marginLeft:8}}>{isExp?"▲":"▼"}</span>
            </div>

            {isExp&&(
              <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${A.border}`}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
                  {[
                    ["Total Earned",`$${fmt(u.totalEarned)}`],
                    ["Ref Earnings",`$${fmt(u.refEarnings)}`],
                    ["Balance",`$${fmt(u.balance)}`],
                    ["Joined",timeAgo(u.createdAt)],
                  ].map(([l,v])=>(
                    <div key={l} style={{background:"rgba(167,139,250,.04)",borderRadius:7,padding:"8px 10px"}}>
                      <div style={{color:A.faint,fontSize:7,letterSpacing:1.5,fontFamily:A.mono,marginBottom:3}}>{l}</div>
                      <div style={{color:A.text,fontFamily:A.mono,fontSize:10,fontWeight:700}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Last active detail */}
                <div style={{marginBottom:12,padding:"8px 10px",background:"rgba(167,139,250,.04)",borderRadius:7}}>
                  <div style={{color:A.faint,fontSize:7,letterSpacing:1.5,fontFamily:A.mono,marginBottom:3}}>LAST ACTIVE</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <ActiveDot lastActive={u.lastActive}/>
                    {u.lastActive&&<span style={{color:A.dim,fontSize:9,fontFamily:A.mono}}>({new Date(u.lastActive).toLocaleString()})</span>}
                  </div>
                </div>
                {plan&&(
                  <div style={{marginBottom:12,padding:"10px 12px",background:"rgba(52,211,153,.06)",border:"1px solid rgba(52,211,153,.15)",borderRadius:8}}>
                    <div style={{color:A.green,fontFamily:A.mono,fontSize:10,fontWeight:700,marginBottom:3}}>{plan.icon} {plan.name} Plan — ACTIVE</div>
                    <div style={{color:A.dim,fontSize:9,fontFamily:A.mono}}>Expires: {new Date(u.activePlan.expiresAt).toLocaleDateString()} · +${plan.daily}/day</div>
                  </div>
                )}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <ABtn c="primary" onClick={()=>setPlan(u._id,u.name)} disabled={actionId===u._id}>{actionId===u._id?<Spin/>:"⚡ SET PLAN"}</ABtn>
                  {plan&&<ABtn c="ghost" onClick={()=>removePlan(u._id,u.name)} disabled={actionId===u._id} style={{color:A.orange}}>🗑 REMOVE PLAN</ABtn>}
                  <ABtn c="blue" onClick={()=>sendMoney(u._id,u.name)} disabled={actionId===u._id}>💸 SEND $</ABtn>
                  <ABtn c="ghost" onClick={()=>adjustBal(u._id,u.name)} disabled={actionId===u._id} style={{color:A.blue}}>💰 ADJ BAL</ABtn>
                  <ABtn c="ghost" onClick={()=>notifyUser(u._id,u.name)} disabled={actionId===u._id} style={{color:A.gold}}>🔔 NOTIFY</ABtn>
                  <ABtn c={u.isBlocked?"green":"red"} onClick={()=>block(u._id)} disabled={actionId===u._id}>{u.isBlocked?"✅ UNBLOCK":"🚫 BLOCK"}</ABtn>
                </div>
              </div>
            )}
          </ACard>
        );
      })}
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────
function extractUid(t){
  if(typeof t.userId==="string"&&t.userId.length>5) return t.userId;
  if(t.userId&&t.userId.$oid) return t.userId.$oid;
  if(typeof t._id==="string"&&t._id.length>5) return t._id;
  if(t._id&&t._id.$oid) return t._id.$oid;
  return null;
}
function ChatTab({adminKey,onMsg}){
  const [threads,setThreads]=useState([]); const [loading,setLoading]=useState(true);
  const [activeUser,setActiveUser]=useState(null);
  const [msgs,setMsgs]=useState([]); const [reply,setReply]=useState("");
  const [sending,setSending]=useState(false); const [dbg,setDbg]=useState("");
  const bottomRef=useRef(null);

  const loadThreads=useCallback(async()=>{
    try{
      const data=await api.aChatThreads(adminKey);
      setThreads(data);
      if(data&&data.length>0) setDbg(JSON.stringify(data[0],null,2));
    }catch(e){onMsg(e.message,"err");}
    finally{setLoading(false);}
  },[adminKey]);

  useEffect(()=>{ loadThreads(); const t=setInterval(loadThreads,15000); return()=>clearInterval(t); },[loadThreads]);

  const openThread=async(thread)=>{
    const uid=extractUid(thread);
    if(!uid){ onMsg("NO USER ID — see debug panel below","err"); return; }
    const info={userId:uid,name:thread.user?.name||thread.userId?.name||"User",email:thread.user?.email||thread.userId?.email||"",lastActive:thread.user?.lastActive};
    setActiveUser(info); setMsgs([]);
    try{ setMsgs(await api.aChatUser(adminKey,uid)); }catch(e){ onMsg(e.message,"err"); }
    loadThreads();
  };

  const sendReply=async()=>{
    if(!reply.trim()||!activeUser) return;
    setSending(true);
    try{
      const msg=await api.aChatReply(adminKey,activeUser.userId,reply.trim());
      setMsgs(m=>[...m,msg]); setReply(""); loadThreads();
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
    }catch(e){ onMsg(e.message,"err"); }
    finally{ setSending(false); }
  };

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  if(activeUser) return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <button onClick={()=>{setActiveUser(null);setMsgs([]);}} style={{background:"none",border:`1px solid ${A.border}`,color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",padding:"6px 10px",borderRadius:7}}>{"<- THREADS"}</button>
        <div style={{flex:1}}>
          <div style={{color:A.text,fontFamily:A.mono,fontSize:12,fontWeight:700}}>{activeUser.name}</div>
          <div style={{color:A.dim,fontSize:9,fontFamily:A.mono}}>{activeUser.email} &middot; <ActiveDot lastActive={activeUser.lastActive}/></div>
          <div style={{color:A.faint,fontSize:7,fontFamily:A.mono}}>uid: {activeUser.userId}</div>
        </div>
        <button onClick={()=>openThread({userId:activeUser.userId,user:{name:activeUser.name,email:activeUser.email,lastActive:activeUser.lastActive}})} style={{background:"none",border:`1px solid ${A.border}`,color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",padding:"6px 10px",borderRadius:7}}>{"[R]"}</button>
      </div>
      <div style={{background:"rgba(0,0,0,.3)",borderRadius:12,border:`1px solid ${A.border}`,padding:14,minHeight:300,maxHeight:440,overflowY:"auto",marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0&&<div style={{color:A.faint,fontFamily:A.mono,fontSize:10,textAlign:"center",padding:"30px 0"}}>No messages yet</div>}
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.sender==="admin"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"75%",padding:"9px 13px",borderRadius:m.sender==="admin"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.sender==="admin"?"linear-gradient(135deg,#7c3aed,#a78bfa)":"rgba(167,139,250,.1)",border:m.sender==="user"?"1px solid rgba(167,139,250,.2)":"none"}}>
              {m.language&&m.sender==="user"&&<div style={{color:"rgba(255,255,255,.5)",fontSize:7,fontFamily:A.mono,marginBottom:3}}>{m.language.toUpperCase()}</div>}
              <div style={{color:"#fff",fontSize:12,lineHeight:1.5}}>{m.message}</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:8,fontFamily:A.mono,marginTop:3,textAlign:m.sender==="admin"?"right":"left"}}>{timeAgo(m.createdAt)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
        <textarea placeholder="Type reply... (Enter=send, Shift+Enter=newline)" value={reply}
          onChange={e=>setReply(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}}
          rows={2} style={{flex:1,background:"rgba(167,139,250,.07)",border:"1px solid rgba(167,139,250,.3)",borderRadius:8,padding:"10px 13px",color:A.text,fontFamily:"inherit",fontSize:12,outline:"none",resize:"none",lineHeight:1.5}}/>
        <ABtn c="primary" onClick={sendReply} disabled={sending||!reply.trim()} style={{padding:"12px 20px",height:52,flexShrink:0}}>
          {sending?<Spin/>:"SEND"}
        </ABtn>
      </div>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:A.text,fontFamily:A.mono,fontSize:12,fontWeight:700}}>SUPPORT THREADS</div>
        <button onClick={loadThreads} style={{background:"none",border:`1px solid ${A.border}`,color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",padding:"6px 10px",borderRadius:7}}>[R]</button>
      </div>
      {loading&&<div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading&&threads.length===0&&<div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No chat threads yet</div>}
      {threads.map((t,i)=>{
        const uid=extractUid(t);
        return(
          <ACard key={i} style={{marginBottom:8,cursor:"pointer",border:`1px solid ${t.unread>0?"rgba(167,139,250,.3)":A.border}`}} onClick={()=>openThread(t)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <div style={{color:A.text,fontSize:12,fontWeight:600}}>{t.user?.name||"Unknown"}</div>
                  {t.unread>0&&<span style={{background:A.red,color:"#fff",fontSize:8,padding:"1px 7px",borderRadius:10,fontFamily:A.mono,fontWeight:700}}>{t.unread} NEW</span>}
                  {!uid&&<span style={{color:A.red,fontSize:8,fontFamily:A.mono}}>NO-ID</span>}
                </div>
                <div style={{color:A.dim,fontSize:9,fontFamily:A.mono,marginBottom:2}}>{t.user?.email}</div>
                <div style={{color:A.faint,fontSize:9,fontFamily:A.mono,marginBottom:2}}>id: {uid||"MISSING"}</div>
                <div style={{color:A.faint,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:280}}>{t.lastSender==="admin"?"You: ":""}{t.lastMessage}</div>
              </div>
              <div style={{textAlign:"right",marginLeft:10,flexShrink:0}}>
                <div style={{color:A.faint,fontSize:8,fontFamily:A.mono,marginBottom:4}}>{timeAgo(t.lastTime)}</div>
                <ActiveDot lastActive={t.user?.lastActive}/>
              </div>
            </div>
          </ACard>
        );
      })}
      {dbg&&(
        <div style={{marginTop:16,padding:12,background:"rgba(0,0,0,.6)",border:"1px solid rgba(251,191,36,.3)",borderRadius:8}}>
          <div style={{color:A.gold,fontFamily:A.mono,fontSize:8,marginBottom:6}}>DEBUG: FIRST THREAD FROM SERVER</div>
          <pre style={{color:A.faint,fontFamily:A.mono,fontSize:8,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{dbg}</pre>
        </div>
      )}
    </div>
  );
}
// ── Announcements Tab ─────────────────────────────────────────
function AnnouncementsTab({adminKey,onMsg}){
  const [anns,setAnns]=useState([]); const [loading,setLoading]=useState(true);
  const [text,setText]=useState(""); const [emoji,setEmoji]=useState("📢");
  const [type,setType]=useState("info"); const [saving,setSaving]=useState(false);
  const [notifyAll,setNotifyAll]=useState(""); const [notifType,setNotifType]=useState("info");
  const [notifSending,setNotifSending]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{setAnns(await api.aAnnouncements(adminKey));}catch(e){onMsg(e.message,"err");}
    finally{setLoading(false);}
  },[adminKey]);

  useEffect(()=>{ load(); },[load]);

  const add=async()=>{
    if(!text.trim()){onMsg("Enter announcement text","err");return;}
    setSaving(true);
    try{await api.aAddAnnouncement(adminKey,{text,emoji,type});onMsg("✅ Announcement added!");setText("");load();}
    catch(e){onMsg(e.message,"err");}
    finally{setSaving(false);}
  };

  const toggle=async(id,active)=>{
    try{await api.aToggleAnnouncement(adminKey,id,{active:!active});load();}
    catch(e){onMsg(e.message,"err");}
  };

  const del=async(id)=>{
    if(!window.confirm("Delete this announcement?")) return;
    try{await api.aDeleteAnnouncement(adminKey,id);onMsg("Deleted");load();}
    catch(e){onMsg(e.message,"err");}
  };

  const sendAll=async()=>{
    if(!notifyAll.trim()){onMsg("Enter message","err");return;}
    setNotifSending(true);
    try{const r=await api.aNotifyAll(adminKey,notifyAll,notifType);onMsg(r.message);setNotifyAll("");}
    catch(e){onMsg(e.message,"err");}
    finally{setNotifSending(false);}
  };

  const typeColors={info:A.accent,warning:A.gold,success:A.green,urgent:A.red};

  return(
    <div>
      {/* Add announcement */}
      <ACard style={{marginBottom:14,background:"linear-gradient(135deg,rgba(76,29,149,.2),rgba(8,5,22,.98))"}}>
        <ALbl>ADD NEWS TICKER ITEM</ALbl>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          <AInput placeholder="Emoji (e.g. 🎁)" value={emoji} onChange={e=>setEmoji(e.target.value)} style={{width:80}}/>
          <select value={type} onChange={e=>setType(e.target.value)} style={{background:"rgba(167,139,250,.07)",border:`1px solid ${A.border}`,borderRadius:8,padding:"9px 12px",color:A.text,fontFamily:A.mono,fontSize:10,outline:"none",cursor:"pointer"}}>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <AInput placeholder="Announcement text shown in news ticker..." value={text} onChange={e=>setText(e.target.value)} style={{width:"100%",marginBottom:10}}/>
        <ABtn c="primary" onClick={add} disabled={saving} style={{width:"100%",padding:"10px"}}>{saving?<Spin/>:"📢 ADD TO TICKER"}</ABtn>
      </ACard>

      {/* Existing announcements */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{color:A.text,fontFamily:A.mono,fontSize:11,fontWeight:700}}>ACTIVE TICKER ITEMS ({anns.filter(a=>a.active).length})</div>
          <button onClick={load} style={{background:"none",border:`1px solid ${A.border}`,color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",padding:"6px 10px",borderRadius:7}}>🔄</button>
        </div>
        {loading&&<div style={{textAlign:"center",padding:20}}><Spin/></div>}
        {!loading&&anns.length===0&&<div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"20px 0"}}>No announcements yet</div>}
        {anns.map(a=>(
          <ACard key={a._id} style={{marginBottom:8,border:`1px solid ${a.active?typeColors[a.type]+"33":A.border}`,opacity:a.active?1:.6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:16}}>{a.emoji}</span>
                  <ATag c={typeColors[a.type]||A.accent}>{a.type.toUpperCase()}</ATag>
                  {a.active?<ATag c={A.green}>LIVE</ATag>:<ATag c={A.faint}>HIDDEN</ATag>}
                  {/* READ COUNT */}
                  <ATag c={A.blue}>👁 {a.reads||0} reads</ATag>
                </div>
                <div style={{color:A.text,fontSize:11,lineHeight:1.5,marginBottom:4}}>{a.text}</div>
                <div style={{color:A.faint,fontSize:8,fontFamily:A.mono}}>{timeAgo(a.createdAt)} · {a.reads||0} users read this</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                <ABtn c={a.active?"ghost":"green"} onClick={()=>toggle(a._id,a.active)} style={{fontSize:8,padding:"5px 10px"}}>{a.active?"HIDE":"SHOW"}</ABtn>
                <ABtn c="red" onClick={()=>del(a._id)} style={{fontSize:8,padding:"5px 10px"}}>DELETE</ABtn>
              </div>
            </div>
          </ACard>
        ))}
      </div>

      {/* Broadcast notification to all users */}
      <ACard style={{background:"linear-gradient(135deg,rgba(16,52,87,.3),rgba(8,5,22,.98))"}}>
        <ALbl c={A.blue}>BROADCAST NOTIFICATION TO ALL USERS</ALbl>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <select value={notifType} onChange={e=>setNotifType(e.target.value)} style={{background:"rgba(167,139,250,.07)",border:`1px solid ${A.border}`,borderRadius:8,padding:"9px 12px",color:A.text,fontFamily:A.mono,fontSize:10,outline:"none",cursor:"pointer"}}>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
        <AInput placeholder="Message to send to ALL users..." value={notifyAll} onChange={e=>setNotifyAll(e.target.value)} style={{width:"100%",marginBottom:10}}/>
        <ABtn c="blue" onClick={sendAll} disabled={notifSending} style={{width:"100%",padding:"10px"}}>{notifSending?<Spin/>:"📣 BROADCAST TO ALL USERS"}</ABtn>
      </ACard>
    </div>
  );
}

// ── Referrals Tab ─────────────────────────────────────────────
function ReferralsTab({adminKey,onMsg}){
  const [users,setUsers]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    api.aUsers(adminKey,"").then(setUsers).catch(e=>onMsg(e.message,"err")).finally(()=>setLoading(false));
  },[adminKey]);
  const withRefs=users.filter(u=>(u.referrals?.length||0)>0).sort((a,b)=>(b.referrals?.length||0)-(a.referrals?.length||0));
  return(
    <div>
      <ACard style={{marginBottom:14,background:"linear-gradient(135deg,rgba(76,29,149,.3),rgba(8,5,22,.98))"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,textAlign:"center"}}>
          {[
            ["👥",users.reduce((s,u)=>s+(u.referrals?.length||0),0),"TOTAL REFS"],
            ["💰",`$${fmt(users.reduce((s,u)=>s+(u.refEarnings||0),0))}`,"REF EARNINGS"],
            ["🏆",withRefs.length,"ACTIVE REFERRERS"],
          ].map(([ic,v,l])=>(
            <div key={l}>
              <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
              <div style={{color:A.accent,fontFamily:A.mono,fontSize:13,fontWeight:700,marginBottom:3}}>{v}</div>
              <div style={{color:A.faint,fontSize:7,letterSpacing:1.5,fontFamily:A.mono}}>{l}</div>
            </div>
          ))}
        </div>
      </ACard>
      {loading&&<div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading&&withRefs.length===0&&<div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No referrals yet</div>}
      {withRefs.map(u=>(
        <ACard key={u._id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{color:A.text,fontSize:12,fontWeight:600,marginBottom:2}}>{u.name}</div>
              <div style={{color:A.dim,fontSize:9,fontFamily:A.mono,marginBottom:4}}>{u.email}</div>
              <div style={{color:A.faint,fontFamily:A.mono,fontSize:9}}>Code: <span style={{color:A.accent}}>{u.refCode}</span></div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:A.accent,fontFamily:A.mono,fontSize:15,fontWeight:700}}>{u.referrals?.length||0}</div>
              <div style={{color:A.faint,fontSize:8,fontFamily:A.mono}}>REFS</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
            <div style={{background:"rgba(52,211,153,.06)",border:"1px solid rgba(52,211,153,.12)",borderRadius:7,padding:"8px 10px"}}>
              <div style={{color:A.faint,fontSize:7,letterSpacing:1.5,fontFamily:A.mono,marginBottom:3}}>REF EARNINGS</div>
              <div style={{color:A.green,fontFamily:A.mono,fontSize:12,fontWeight:700}}>${fmt(u.refEarnings)}</div>
            </div>
            <div style={{background:"rgba(167,139,250,.05)",border:`1px solid ${A.border}`,borderRadius:7,padding:"8px 10px"}}>
              <div style={{color:A.faint,fontSize:7,letterSpacing:1.5,fontFamily:A.mono,marginBottom:3}}>REFERRALS</div>
              <div style={{color:A.accent,fontFamily:A.mono,fontSize:12,fontWeight:700}}>{u.referrals?.length||0} users</div>
            </div>
          </div>
        </ACard>
      ))}
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────────
export default function AdminPanel({onExit}){
  const [adminKey,setAdminKey] = useState(()=>sessionStorage.getItem("um_ak")||"");
  const [authed,setAuthed]     = useState(false);
  const [tab,setTab]           = useState("deposits");
  const [stats,setStats]       = useState(null);
  const [toast,setToast]       = useState({msg:"",type:"ok"});
  const [autoRefresh,setAuto]  = useState(false);

  const showMsg=(msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast({msg:"",type:"ok"}),3500); };

  const loadStats=useCallback(async()=>{
    try{setStats(await api.aStats(adminKey));}catch{}
  },[adminKey]);

  useEffect(()=>{ if(authed) loadStats(); },[authed,loadStats]);
  useEffect(()=>{
    if(!authed||!autoRefresh) return;
    const t=setInterval(loadStats,30000);
    return()=>clearInterval(t);
  },[authed,autoRefresh,loadStats]);

  const handleAuth=(key)=>{ sessionStorage.setItem("um_ak",key); setAdminKey(key); setAuthed(true); };
  const handleLogout=()=>{ sessionStorage.removeItem("um_ak"); setAdminKey(""); setAuthed(false); setStats(null); };

  if(!authed) return <AdminLogin onAuth={handleAuth} onBack={onExit}/>;

  const tabs=[
    {id:"deposits",      label:"Deposits",     icon:"💰", badge:stats?.pendingDeps},
    {id:"withdrawals",   label:"Withdrawals",  icon:"💸", badge:stats?.pendingWDs},
    {id:"users",         label:"Users",        icon:"👥", badge:null},
    {id:"chat",          label:"Chat",         icon:"💬", badge:stats?.unreadChats},
    {id:"announcements", label:"News",         icon:"📢", badge:null},
    {id:"referrals",     label:"Referrals",    icon:"🔗", badge:null},
  ];

  return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at top,#160830,${A.bg})`,fontFamily:"'Inter',sans-serif",color:A.text}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {/* Toast */}
      {toast.msg&&(
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:toast.type==="err"?"linear-gradient(135deg,#dc2626,#ef4444)":"linear-gradient(135deg,#059669,#34d399)",color:"#fff",padding:"11px 22px",borderRadius:10,fontFamily:A.mono,fontSize:10,letterSpacing:1,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,.6)",animation:"slideDown .3s ease",whiteSpace:"nowrap",maxWidth:"90vw",textAlign:"center"}}>
          {toast.type==="err"?"❌ ":"✅ "}{toast.msg}
        </div>
      )}
      {/* Header */}
      <div style={{background:"rgba(8,5,22,.98)",borderBottom:`1px solid ${A.border}`,padding:"14px 16px",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>⛏️</span>
            <div>
              <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:14,fontWeight:900,fontFamily:A.mono,letterSpacing:3}}>ADMIN</div>
              <div style={{color:A.faint,fontSize:8,fontFamily:A.mono,letterSpacing:2}}>USDTMINE PANEL</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {stats?.onlineCount>0&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:"rgba(52,211,153,.1)",border:"1px solid rgba(52,211,153,.2)",borderRadius:7}}><span style={{width:6,height:6,borderRadius:"50%",background:A.green,animation:"pulse 1.5s infinite",display:"inline-block"}}/><span style={{color:A.green,fontFamily:A.mono,fontSize:8,fontWeight:700}}>{stats.onlineCount} ONLINE</span></div>}
            <button onClick={loadStats} style={{background:"rgba(167,139,250,.08)",border:`1px solid ${A.border}`,color:A.dim,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>🔄</button>
            <button onClick={()=>setAuto(v=>!v)} style={{background:autoRefresh?"rgba(52,211,153,.12)":"rgba(167,139,250,.08)",border:`1px solid ${autoRefresh?"rgba(52,211,153,.3)":A.border}`,color:autoRefresh?A.green:A.dim,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>{autoRefresh?"⏹ AUTO":"▶ AUTO"}</button>
            <button onClick={handleLogout} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:A.red,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>LOGOUT</button>
            <button onClick={onExit} style={{background:"rgba(167,139,250,.08)",border:`1px solid ${A.border}`,color:A.dim,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>← SITE</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 16px 80px"}}>
        <StatsBar stats={stats}/>
        {/* Tab bar */}
        <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 14px",borderRadius:9,border:`1px solid ${tab===t.id?A.accent:A.border}`,background:tab===t.id?"rgba(167,139,250,.15)":"rgba(167,139,250,.04)",color:tab===t.id?A.accent:A.dim,fontFamily:A.mono,fontSize:9,letterSpacing:1.5,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,position:"relative",transition:"all .2s"}}>
              {t.icon} {t.label.toUpperCase()}
              {(t.badge||0)>0&&<span style={{position:"absolute",top:-4,right:-4,background:A.red,color:"#fff",fontSize:8,fontWeight:900,padding:"1px 5px",borderRadius:8,fontFamily:A.mono}}>{t.badge}</span>}
            </button>
          ))}
        </div>
        {/* Tab content */}
        {tab==="deposits"      && <DepositsTab      adminKey={adminKey} onMsg={showMsg} onRefreshStats={loadStats}/>}
        {tab==="withdrawals"   && <WithdrawalsTab   adminKey={adminKey} onMsg={showMsg} onRefreshStats={loadStats}/>}
        {tab==="users"         && <UsersTab         adminKey={adminKey} onMsg={showMsg} onRefreshStats={loadStats}/>}
        {tab==="chat"          && <ChatTab          adminKey={adminKey} onMsg={showMsg}/>}
        {tab==="announcements" && <AnnouncementsTab adminKey={adminKey} onMsg={showMsg}/>}
        {tab==="referrals"     && <ReferralsTab     adminKey={adminKey} onMsg={showMsg}/>}
      </div>
    </div>
  );
}
