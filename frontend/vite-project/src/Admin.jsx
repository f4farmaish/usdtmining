import { useState, useEffect, useCallback } from "react";
import { api, PLANS, fmt, timeAgo } from "./api.js";

const A = {
  bg:"#04020f", card:"rgba(8,5,22,.98)", border:"rgba(167,139,250,.12)",
  accent:"#a78bfa", blue:"#60a5fa", gold:"#fbbf24",
  text:"#e2e8f0", dim:"rgba(226,232,240,.45)", faint:"rgba(226,232,240,.15)",
  green:"#34d399", red:"#f87171", orange:"#fb923c",
  mono:"'Space Mono',monospace",
};

// ── Primitives ────────────────────────────────────────────────
function ACard({children,style={}}) {
  return <div style={{background:A.card,border:`1px solid ${A.border}`,borderRadius:12,padding:16,backdropFilter:"blur(20px)",...style}}>{children}</div>;
}
function ALbl({children,c=A.accent}) {
  return <div style={{color:c,fontSize:8,letterSpacing:2.5,textTransform:"uppercase",fontFamily:A.mono,marginBottom:6,fontWeight:700}}>{children}</div>;
}
function ABtn({children,onClick,disabled,c="primary",style={}}) {
  const [h,setH]=useState(false);
  const bg={primary:"linear-gradient(135deg,#7c3aed,#a78bfa)",green:"linear-gradient(135deg,#059669,#34d399)",red:"linear-gradient(135deg,#dc2626,#ef4444)",ghost:"rgba(167,139,250,.08)",orange:"linear-gradient(135deg,#c2410c,#fb923c)"}[c]||"rgba(167,139,250,.08)";
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseOver={()=>setH(true)} onMouseOut={()=>setH(false)}
      style={{padding:"8px 14px",borderRadius:8,border:"none",background:bg,color:"#fff",fontFamily:A.mono,fontSize:9,letterSpacing:1.5,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.4:1,transition:"all .15s",transform:h&&!disabled?"translateY(-1px)":"translateY(0)",boxShadow:h&&!disabled?"0 4px 16px rgba(124,58,237,.3)":"none",...style}}>
      {children}
    </button>
  );
}
function AInput({placeholder,value,onChange,type="text",style={}}) {
  const [f,setF]=useState(false);
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:f?"rgba(167,139,250,.07)":"rgba(255,255,255,.02)",border:`1px solid ${f?"rgba(167,139,250,.4)":A.border}`,borderRadius:8,padding:"9px 13px",color:A.text,fontFamily:A.mono,fontSize:11,outline:"none",transition:"all .2s",...style}}
    />
  );
}
function ATag({children,c=A.accent}) {
  return <span style={{background:`${c}18`,border:`1px solid ${c}30`,color:c,fontSize:8,letterSpacing:1.5,padding:"2px 8px",borderRadius:5,fontFamily:A.mono,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
}
function StatBadge({s}) {
  const m={pending:[A.gold,"PENDING"],approved:[A.green,"APPROVED"],completed:[A.green,"DONE"],rejected:[A.red,"REJECTED"],processing:[A.blue,"PROCESSING"]};
  const [c,l]=m[s]||[A.faint,(s||"").toUpperCase()];
  return <ATag c={c}>{l}</ATag>;
}
function Spin() {
  return <div style={{width:16,height:16,border:"2px solid rgba(167,139,250,.2)",borderTop:"2px solid #a78bfa",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>;
}

// ── Login screen ──────────────────────────────────────────────
function AdminLogin({onAuth,onBack}) {
  const [key,setKey]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit = async () => {
    if(!key.trim()){setErr("Enter admin key");return;}
    setLoading(true); setErr("");
    try {
      await api.aStats(key.trim());
      onAuth(key.trim());
    } catch(e) { setErr("Wrong admin key"); }
    finally { setLoading(false); }
  };
  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at top,#160830,${A.bg})`,display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:A.mono}}>
      <div style={{width:"100%",maxWidth:380,animation:"fadeUp .4s ease"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:10}}>🔐</div>
          <div style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:22,fontWeight:900,letterSpacing:4}}>ADMIN PANEL</div>
          <div style={{color:A.faint,fontSize:9,letterSpacing:3,marginTop:4}}>USDTMINE CONTROL CENTER</div>
        </div>
        <ACard>
          {err && <div style={{color:A.red,fontSize:10,marginBottom:12,padding:"8px 12px",background:"rgba(239,68,68,.08)",borderRadius:8,border:"1px solid rgba(239,68,68,.2)"}}>{err}</div>}
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
function StatsBar({stats}) {
  if(!stats) return null;
  const items=[
    ["👥","Users",stats.totalUsers,A.accent],
    ["💰","Revenue",`$${fmt(stats.revenue)}`,A.green],
    ["⏳","Dep. Pending",stats.pendingDeps,A.gold],
    ["⏳","W/D Pending",stats.pendingWDs,A.orange],
    ["✅","Approved Deps",stats.approvedDeps,A.blue],
    ["💎","Total Balance",`$${fmt(stats.totalBalance)}`,A.accent],
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
      {items.map(([ic,lb,vl,c])=>(
        <ACard key={lb} style={{padding:"12px 10px",textAlign:"center"}}>
          <div style={{fontSize:16,marginBottom:4}}>{ic}</div>
          <div style={{color:c,fontFamily:A.mono,fontSize:13,fontWeight:700,marginBottom:3}}>{vl}</div>
          <div style={{color:A.faint,fontSize:7,letterSpacing:1.5}}>{lb.toUpperCase()}</div>
        </ACard>
      ))}
    </div>
  );
}

// ── Deposit Tab ───────────────────────────────────────────────
function DepositsTab({adminKey,onMsg,onRefreshStats}) {
  const [deps,setDeps]=useState([]); const [loading,setLoading]=useState(true); const [filter,setFilter]=useState("pending"); const [actionId,setActionId]=useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try { setDeps(await api.aDeposits(adminKey,filter)); } catch(e){ onMsg(e.message,"err"); }
    finally{ setLoading(false); }
  },[adminKey,filter]);

  useEffect(()=>{ load(); },[load]);

  const approve = async(id) => {
    setActionId(id);
    try { const r=await api.aApprove(adminKey,id); onMsg(r.message); load(); onRefreshStats(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };
  const reject = async(id) => {
    const note = window.prompt("Rejection reason (optional):") || "";
    setActionId(id);
    try { await api.aReject(adminKey,id,note); onMsg("Deposit rejected"); load(); onRefreshStats(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["pending","approved","rejected","all"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${filter===f?A.accent:A.border}`,background:filter===f?"rgba(167,139,250,.15)":"transparent",color:filter===f?A.accent:A.dim,fontFamily:A.mono,fontSize:9,letterSpacing:1.5,cursor:"pointer",textTransform:"uppercase"}}>
            {f}
          </button>
        ))}
        <button onClick={load} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${A.border}`,background:"transparent",color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",marginLeft:"auto"}}>🔄</button>
      </div>

      {loading && <div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading && deps.length===0 && <div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No {filter} deposits</div>}

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
          <div style={{marginBottom:10}}>
            <div style={{color:A.faint,fontSize:8,fontFamily:A.mono,letterSpacing:1.5,marginBottom:4}}>TX HASH</div>
            <div style={{background:"rgba(167,139,250,.04)",border:`1px solid ${A.border}`,borderRadius:7,padding:"8px 10px",fontFamily:A.mono,color:A.accent,fontSize:9,wordBreak:"break-all",lineHeight:1.7}}>{d.txHash}</div>
          </div>
          {d.adminNote && <div style={{marginBottom:10,color:A.red,fontSize:10,fontFamily:A.mono}}>Note: {d.adminNote}</div>}
          {d.status==="pending" && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <ABtn c="green" onClick={()=>approve(d._id)} disabled={actionId===d._id}>
                {actionId===d._id?<Spin/>:"✅ APPROVE"}
              </ABtn>
              <ABtn c="red" onClick={()=>reject(d._id)} disabled={actionId===d._id}>
                ❌ REJECT
              </ABtn>
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
function WithdrawalsTab({adminKey,onMsg,onRefreshStats}) {
  const [wds,setWds]=useState([]); const [loading,setLoading]=useState(true); const [filter,setFilter]=useState("pending"); const [actionId,setActionId]=useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try { setWds(await api.aWithdrawals(adminKey,filter)); } catch(e){ onMsg(e.message,"err"); }
    finally{ setLoading(false); }
  },[adminKey,filter]);

  useEffect(()=>{ load(); },[load]);

  const complete = async(id) => {
    const tx = window.prompt("Enter TxHash of your sent payment (optional):") || "";
    setActionId(id);
    try { await api.aCompleteW(adminKey,id,tx); onMsg("✅ Withdrawal marked as completed!"); load(); onRefreshStats(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };
  const reject = async(id,amount) => {
    const note = window.prompt("Rejection reason:") || "";
    setActionId(id);
    try { await api.aRejectW(adminKey,id,note); onMsg(`Rejected. $${amount} refunded to user.`); load(); onRefreshStats(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["pending","completed","rejected","all"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${filter===f?A.accent:A.border}`,background:filter===f?"rgba(167,139,250,.15)":"transparent",color:filter===f?A.accent:A.dim,fontFamily:A.mono,fontSize:9,letterSpacing:1.5,cursor:"pointer",textTransform:"uppercase"}}>
            {f}
          </button>
        ))}
        <button onClick={load} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${A.border}`,background:"transparent",color:A.dim,fontFamily:A.mono,fontSize:9,cursor:"pointer",marginLeft:"auto"}}>🔄</button>
      </div>

      {loading && <div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading && wds.length===0 && <div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No {filter} withdrawals</div>}

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
          {w.txHash && <div style={{color:A.green,fontSize:9,fontFamily:A.mono,marginBottom:10}}>TX: {w.txHash}</div>}
          {w.adminNote && <div style={{color:A.red,fontSize:10,fontFamily:A.mono,marginBottom:10}}>Note: {w.adminNote}</div>}
          {w.status==="pending" && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <ABtn c="green" onClick={()=>complete(w._id)} disabled={actionId===w._id}>
                {actionId===w._id?<Spin/>:"✅ MARK SENT"}
              </ABtn>
              <ABtn c="red" onClick={()=>reject(w._id,w.amount)} disabled={actionId===w._id}>
                ❌ REJECT & REFUND
              </ABtn>
            </div>
          )}
        </ACard>
      ))}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────
function UsersTab({adminKey,onMsg,onRefreshStats}) {
  const [users,setUsers]=useState([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState(""); const [actionId,setActionId]=useState(null);
  const [expandId,setExpandId]=useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try { setUsers(await api.aUsers(adminKey,search)); } catch(e){ onMsg(e.message,"err"); }
    finally{ setLoading(false); }
  },[adminKey,search]);

  useEffect(()=>{ const t=setTimeout(load,400); return ()=>clearTimeout(t); },[load]);

  const block = async(id) => {
    setActionId(id);
    try { const r=await api.aBlock(adminKey,id); onMsg(r.message); load(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };

  const adjustBal = async(id,name) => {
    const v = window.prompt(`Adjust balance for ${name}\n(+10 to add, -10 to subtract):`);
    if(!v||isNaN(parseFloat(v))) return;
    setActionId(id);
    try { const r=await api.aAdjustBal(adminKey,id,parseFloat(v)); onMsg(r.message); load(); onRefreshStats(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };

  const setPlan = async(id,name) => {
    const planNames = PLANS.map(p=>`${p.id}. ${p.icon} ${p.name} ($${p.price})`).join("\n");
    const v = window.prompt(`Set plan for ${name}:\n${planNames}\n\nEnter plan number (1-7):`);
    if(!v||isNaN(parseInt(v))) return;
    setActionId(id);
    try { const r=await api.aSetPlan(adminKey,id,parseInt(v)); onMsg(r.message); load(); onRefreshStats(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };

  const removePlan = async(id,name) => {
    if(!window.confirm(`Remove plan from ${name}?`)) return;
    setActionId(id);
    try { await api.aRemovePlan(adminKey,id); onMsg("Plan removed"); load(); }
    catch(e){ onMsg(e.message,"err"); }
    finally{ setActionId(null); }
  };

  return (
    <div>
      <div style={{marginBottom:14}}>
        <AInput placeholder="🔍 Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%"}}/>
      </div>

      {loading && <div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading && users.length===0 && <div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No users found</div>}

      {users.map(u=>{
        const plan = u.activePlan?.planId ? PLANS.find(p=>p.id===u.activePlan.planId) : null;
        const isExpanded = expandId===u._id;
        return (
          <ACard key={u._id} style={{marginBottom:10,border:`1px solid ${u.isBlocked?"rgba(239,68,68,.2)":A.border}`,cursor:"pointer"}} onClick={()=>setExpandId(isExpanded?null:u._id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <div style={{color:A.text,fontSize:12,fontWeight:600}}>{u.name}</div>
                  {u.isBlocked && <ATag c={A.red}>BLOCKED</ATag>}
                  {plan && <ATag c={plan.color}>{plan.icon} {plan.name}</ATag>}
                  {!plan && <ATag c={A.faint}>NO PLAN</ATag>}
                </div>
                <div style={{color:A.dim,fontSize:9,fontFamily:A.mono,marginBottom:4}}>{u.email}</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  <span style={{color:A.green,fontFamily:A.mono,fontSize:10,fontWeight:700}}>💰 ${fmt(u.balance)}</span>
                  <span style={{color:A.dim,fontFamily:A.mono,fontSize:9}}>👥 {u.referrals?.length||0} refs</span>
                  <span style={{color:A.dim,fontFamily:A.mono,fontSize:9}}>📅 {timeAgo(u.createdAt)}</span>
                </div>
              </div>
              <span style={{color:A.faint,fontSize:12,marginLeft:8}}>{isExpanded?"▲":"▼"}</span>
            </div>

            {isExpanded && (
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
                {plan && (
                  <div style={{marginBottom:12,padding:"10px 12px",background:"rgba(52,211,153,.06)",border:"1px solid rgba(52,211,153,.15)",borderRadius:8}}>
                    <div style={{color:A.green,fontFamily:A.mono,fontSize:10,fontWeight:700,marginBottom:3}}>{plan.icon} {plan.name} Plan — ACTIVE</div>
                    <div style={{color:A.dim,fontSize:9,fontFamily:A.mono}}>
                      Expires: {new Date(u.activePlan.expiresAt).toLocaleDateString()} · +${plan.daily}/day
                    </div>
                  </div>
                )}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <ABtn c="primary" onClick={()=>setPlan(u._id,u.name)} disabled={actionId===u._id}>
                    {actionId===u._id?<Spin/>:"⚡ SET PLAN"}
                  </ABtn>
                  {plan && <ABtn c="ghost" onClick={()=>removePlan(u._id,u.name)} disabled={actionId===u._id} style={{color:A.orange}}>🗑 REMOVE PLAN</ABtn>}
                  <ABtn c="ghost" onClick={()=>adjustBal(u._id,u.name)} disabled={actionId===u._id} style={{color:A.blue}}>💰 ADJ BAL</ABtn>
                  <ABtn c={u.isBlocked?"green":"red"} onClick={()=>block(u._id)} disabled={actionId===u._id}>
                    {u.isBlocked?"✅ UNBLOCK":"🚫 BLOCK"}
                  </ABtn>
                </div>

                {/* Referrals list */}
                {u.referrals?.length>0 && (
                  <div style={{marginTop:12}}>
                    <div style={{color:A.faint,fontSize:8,fontFamily:A.mono,letterSpacing:2,marginBottom:6}}>REFERRALS ({u.referrals.length})</div>
                    <div style={{color:A.dim,fontSize:10,fontFamily:A.mono}}>This user has {u.referrals.length} referral{u.referrals.length!==1?"s":""}</div>
                  </div>
                )}
              </div>
            )}
          </ACard>
        );
      })}
    </div>
  );
}

// ── Referrals Tab ──────────────────────────────────────────────
function ReferralsTab({adminKey,onMsg}) {
  const [users,setUsers]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    api.aUsers(adminKey,"").then(setUsers).catch(e=>onMsg(e.message,"err")).finally(()=>setLoading(false));
  },[adminKey]);

  const withRefs = users.filter(u=>(u.referrals?.length||0)>0).sort((a,b)=>(b.referrals?.length||0)-(a.referrals?.length||0));

  return (
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

      {loading && <div style={{textAlign:"center",padding:30}}><Spin/></div>}
      {!loading && withRefs.length===0 && <div style={{color:A.faint,fontFamily:A.mono,fontSize:11,textAlign:"center",padding:"30px 0"}}>No referrals yet</div>}

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
export default function AdminPanel({onExit}) {
  const [adminKey,setAdminKey] = useState(()=>sessionStorage.getItem("um_ak")||"");
  const [authed,setAuthed]     = useState(false);
  const [tab,setTab]           = useState("deposits");
  const [stats,setStats]       = useState(null);
  const [toast,setToast]       = useState({msg:"",type:"ok"});
  const [autoRefresh,setAuto]  = useState(false);

  const showMsg = (msg,type="ok") => { setToast({msg,type}); setTimeout(()=>setToast({msg:"",type:"ok"}),3500); };

  const loadStats = useCallback(async()=>{
    try { setStats(await api.aStats(adminKey)); } catch{}
  },[adminKey]);

  useEffect(()=>{ if(authed) loadStats(); },[authed,loadStats]);

  // Auto-refresh stats every 30s
  useEffect(()=>{
    if(!authed||!autoRefresh) return;
    const t = setInterval(loadStats,30000);
    return ()=>clearInterval(t);
  },[authed,autoRefresh,loadStats]);

  const handleAuth = (key) => {
    sessionStorage.setItem("um_ak",key);
    setAdminKey(key); setAuthed(true);
  };
  const handleLogout = () => {
    sessionStorage.removeItem("um_ak");
    setAdminKey(""); setAuthed(false); setStats(null);
  };

  if(!authed) return <AdminLogin onAuth={handleAuth} onBack={onExit}/>;

  const tabs=[
    {id:"deposits",   label:"Deposits",    icon:"💰", badge:stats?.pendingDeps},
    {id:"withdrawals",label:"Withdrawals", icon:"💸", badge:stats?.pendingWDs},
    {id:"users",      label:"Users",       icon:"👥", badge:null},
    {id:"referrals",  label:"Referrals",   icon:"🔗", badge:null},
  ];

  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at top,#160830,${A.bg})`,fontFamily:"'Inter',sans-serif",color:A.text}}>
      {/* Toast */}
      {toast.msg && (
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
            <button onClick={loadStats} style={{background:"rgba(167,139,250,.08)",border:`1px solid ${A.border}`,color:A.dim,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>🔄</button>
            <button onClick={()=>setAuto(v=>!v)} style={{background:autoRefresh?"rgba(52,211,153,.12)":"rgba(167,139,250,.08)",border:`1px solid ${autoRefresh?"rgba(52,211,153,.3)":A.border}`,color:autoRefresh?A.green:A.dim,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>
              {autoRefresh?"⏹ AUTO":"▶ AUTO"}
            </button>
            <button onClick={handleLogout} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:A.red,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>LOGOUT</button>
            <button onClick={onExit} style={{background:"rgba(167,139,250,.08)",border:`1px solid ${A.border}`,color:A.dim,padding:"6px 10px",borderRadius:7,fontFamily:A.mono,fontSize:9,cursor:"pointer"}}>← SITE</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 16px 80px"}}>
        {/* Stats */}
        <StatsBar stats={stats}/>

        {/* Tab bar */}
        <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 14px",borderRadius:9,border:`1px solid ${tab===t.id?A.accent:A.border}`,background:tab===t.id?"rgba(167,139,250,.15)":"rgba(167,139,250,.04)",color:tab===t.id?A.accent:A.dim,fontFamily:A.mono,fontSize:9,letterSpacing:1.5,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,position:"relative",transition:"all .2s"}}>
              {t.icon} {t.label.toUpperCase()}
              {t.badge>0 && (
                <span style={{position:"absolute",top:-4,right:-4,background:A.red,color:"#fff",fontSize:8,fontWeight:900,padding:"1px 5px",borderRadius:8,fontFamily:A.mono}}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab==="deposits"    && <DepositsTab    adminKey={adminKey} onMsg={showMsg} onRefreshStats={loadStats}/>}
        {tab==="withdrawals" && <WithdrawalsTab adminKey={adminKey} onMsg={showMsg} onRefreshStats={loadStats}/>}
        {tab==="users"       && <UsersTab       adminKey={adminKey} onMsg={showMsg} onRefreshStats={loadStats}/>}
        {tab==="referrals"   && <ReferralsTab   adminKey={adminKey} onMsg={showMsg}/>}
      </div>
    </div>
  );
}
