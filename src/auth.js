const enc = new TextEncoder();
const COOKIE='__Host-holiday_session';
const TTL=4*60*60;
const LOGIN_WINDOW=10*60;
const MAX_LOGIN_FAILURES=8;

export function reply(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
}
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function mac(secret,text){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,enc.encode(text)));
}
function equal(a,b){a=String(a||'');b=String(b||'');let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0;}
async function hash(password,salt){
  const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
function cookie(value,age=TTL){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;}

async function session(req,env){
  try{
    const raw=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
    const [payload,sig,extra]=raw.split('.');
    if(extra||!payload||!sig||!equal(sig,await mac(env.SESSION_SECRET,'session:'+payload)))return null;
    const claims=JSON.parse(atob(payload)),t=Math.floor(Date.now()/1000);
    if(!Number.isInteger(claims.exp)||claims.exp<=t||claims.exp>t+TTL||!['group_admin','store'].includes(claims.role))return null;
    if(!await env.DB.prepare('SELECT id FROM auth_sessions WHERE id=? AND expires_at>?').bind(claims.sid,t).first())return null;
    if(claims.role==='group_admin'){
      if(claims.store_id!==null||!equal(claims.version,await mac(env.SESSION_SECRET,'group:'+env.GROUP_ADMIN_PASSWORD)))return null;
    }else{
      const s=await env.DB.prepare('SELECT s.active,c.version FROM stores s JOIN store_credentials c ON c.store_id=s.id WHERE s.id=?').bind(claims.store_id).first();
      if(!s||!s.active||s.version!==claims.version)return null;
    }
    return claims;
  }catch{return null;}
}

export async function guard(req,env){
  const url=new URL(req.url),p=url.pathname;
  if(!p.startsWith('/api/'))return {};
  if(p==='/api/health'&&req.method==='GET')return {};

  // Public hourly-paid-manager request endpoints.
  if(/^\/api\/public\/store\/[a-z0-9-]+$/.test(p)&&req.method==='GET')return {};
  if(p==='/api/public/request-blocks'&&req.method==='GET')return {};
  if(p==='/api/public/holiday-calendar'&&req.method==='GET')return {};
  if(/^\/api\/public\/managers\/\d+\/bookings$/.test(p)&&req.method==='GET')return {};
  if(p==='/api/public/requests'&&req.method==='POST'){
    if(req.headers.get('origin')!==url.origin)return {response:reply({error:'Same-origin request required'},403)};
    return {};
  }
  if(!env.GROUP_ADMIN_PASSWORD||!env.SESSION_SECRET||env.SESSION_SECRET.length<32){
    return {response:reply({error:'Authentication secrets are not configured'},503)};
  }
  if(!['GET','HEAD'].includes(req.method)&&req.headers.get('origin')!==url.origin){
    return {response:reply({error:'Same-origin request required'},403)};
  }

  if(p==='/api/auth/login'&&req.method==='POST'){
    const t=Math.floor(Date.now()/1000);
    await env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(t).run();
    await env.DB.prepare('DELETE FROM auth_login_limits WHERE expires_at<=?').bind(t).run();
    const source=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const rateKey=await mac(env.SESSION_SECRET,'login-rate:'+source);
    const limit=await env.DB.prepare('SELECT attempts,expires_at FROM auth_login_limits WHERE key=?').bind(rateKey).first();
    if(limit&&limit.expires_at>t&&limit.attempts>=MAX_LOGIN_FAILURES){
      const retry=Math.max(1,limit.expires_at-t);
      return {response:reply({error:`Too many incorrect attempts. Try again in ${Math.ceil(retry/60)} minute(s).`},429,{'retry-after':String(retry)})};
    }
    let body={};try{body=await req.json();}catch{}
    const password=body.password;
    if(typeof password!=='string'||!password||password.length>256)return {response:reply({error:'Incorrect password'},401)};
    let role,store_id=null,version;
    if(equal(await mac(env.SESSION_SECRET,password),await mac(env.SESSION_SECRET,env.GROUP_ADMIN_PASSWORD))){
      role='group_admin';version=await mac(env.SESSION_SECRET,'group:'+env.GROUP_ADMIN_PASSWORD);
    }else{
      const lookup=await mac(env.SESSION_SECRET,'lookup:'+password);
      const c=await env.DB.prepare('SELECT c.*,s.active FROM store_credentials c JOIN stores s ON s.id=c.store_id WHERE c.lookup=?').bind(lookup).first();
      const check=await hash(password,c?.salt||'missing-dummy-salt');
      if(!c||!c.active||!equal(check,c.password_hash)){
        const current=limit&&limit.expires_at>t?Number(limit.attempts||0):0,attempts=current+1;
        await env.DB.prepare(`INSERT INTO auth_login_limits(key,attempts,expires_at) VALUES(?,?,?)
          ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts,expires_at=excluded.expires_at`).bind(rateKey,attempts,t+LOGIN_WINDOW).run();
        return {response:reply({error:attempts>=MAX_LOGIN_FAILURES?'Too many incorrect attempts. Try again in 10 minutes.':'Incorrect password'},attempts>=MAX_LOGIN_FAILURES?429:401)};
      }
      role='store';store_id=c.store_id;version=c.version;
    }
    await env.DB.prepare('DELETE FROM auth_login_limits WHERE key=?').bind(rateKey).run();
    const claims={role,store_id,version,sid:crypto.randomUUID(),exp:t+TTL};
    await env.DB.prepare('INSERT INTO auth_sessions(id,expires_at) VALUES(?,?)').bind(claims.sid,claims.exp).run();
    const payload=btoa(JSON.stringify(claims));
    return {response:reply({role,store_id},200,{'set-cookie':cookie(payload+'.'+await mac(env.SESSION_SECRET,'session:'+payload))})};
  }

  const auth=await session(req,env);
  if(!auth)return {response:reply({error:'Please sign in'},401)};
  if(p==='/api/auth/session'&&req.method==='GET')return {response:reply({role:auth.role,store_id:auth.store_id})};
  if(p==='/api/auth/logout'&&req.method==='POST'){
    await env.DB.prepare('DELETE FROM auth_sessions WHERE id=?').bind(auth.sid).run();
    return {response:reply({ok:true},200,{'set-cookie':cookie('',0)})};
  }

  const cred=p.match(/^\/api\/admin\/stores\/(\d+)\/password$/);
  if(cred&&req.method==='PUT'){
    if(auth.role!=='group_admin')return {response:reply({error:'Group admin required'},403)};
    const id=Number(cred[1]);
    if(!await env.DB.prepare('SELECT id FROM stores WHERE id=?').bind(id).first())return {response:reply({error:'Store not found'},404)};
    let body={};try{body=await req.json();}catch{}
    const password=body.password;
    if(typeof password!=='string'||!/^[0-9]{5}$/.test(password))return {response:reply({error:'Use exactly 5 digits'},400)};
    if(equal(password,env.GROUP_ADMIN_PASSWORD))return {response:reply({error:'Use a different password from the group password'},400)};
    const lookup=await mac(env.SESSION_SECRET,'lookup:'+password);
    const duplicate=await env.DB.prepare('SELECT store_id FROM store_credentials WHERE lookup=?').bind(lookup).first();
    if(duplicate&&duplicate.store_id!==id)return {response:reply({error:'Password already assigned to another store'},409)};
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    await env.DB.prepare(`INSERT INTO store_credentials(store_id,lookup,salt,password_hash,version) VALUES(?,?,?,?,?)
      ON CONFLICT(store_id) DO UPDATE SET lookup=excluded.lookup,salt=excluded.salt,password_hash=excluded.password_hash,version=excluded.version`)
      .bind(id,lookup,salt,await hash(password,salt),crypto.randomUUID()).run();
    return {response:reply({ok:true})};
  }

  // Store users can only see their own store.
  if(p==='/api/admin/stores'&&req.method==='GET'&&auth.role==='store'){
    const s=await env.DB.prepare('SELECT id,name,slug,code,email,calendar_name,active,created_at FROM stores WHERE id=?').bind(auth.store_id).first();
    return {response:reply({stores:s?[s]:[]})};
  }
  if(p.startsWith('/api/admin/stores')&&auth.role!=='group_admin')return {response:reply({error:'Group admin required'},403)};

  // Store scope managers/requests server-side.
  if(p==='/api/admin/managers'&&auth.role==='store'){
    if(req.method!=='GET')return {response:reply({error:'Group admin required'},403)};
    const requested=url.searchParams.get('store_id');
    if(requested&&Number(requested)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
    url.searchParams.set('store_id',String(auth.store_id));req=new Request(url,req);
  }
  if(p==='/api/admin/approver-emails'&&auth.role==='store'){
    let requested=url.searchParams.get('store_id');
    if(!requested && !['GET','HEAD'].includes(req.method)){
      let body={};try{body=await req.clone().json();}catch{}
      requested=body.store_id;
    }
    if(requested&&Number(requested)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
    if(['GET','HEAD'].includes(req.method)){
      url.searchParams.set('store_id',String(auth.store_id));req=new Request(url,req);
    }
  }
  const approverEmailEdit=p.match(/^\/api\/admin\/approver-emails\/(\d+)$/);
  if(approverEmailEdit&&auth.role==='store'){
    const row=await env.DB.prepare('SELECT store_id FROM store_approver_emails WHERE id=?').bind(Number(approverEmailEdit[1])).first();
    if(!row||Number(row.store_id)!==auth.store_id)return {response:reply({error:'Approval email not found'},404)};
  }
  const managerEmailEdit=p.match(/^\/api\/admin\/manager-email\/(\d+)$/);
  if(managerEmailEdit&&auth.role==='store'){
    const row=await env.DB.prepare('SELECT store_id FROM managers WHERE id=?').bind(Number(managerEmailEdit[1])).first();
    if(!row||Number(row.store_id)!==auth.store_id)return {response:reply({error:'Manager not found'},404)};
  }

  if(p==='/api/admin/requests'&&auth.role==='store'){
    if(req.method!=='GET')return {response:reply({error:'Store access denied'},403)};
    const requested=url.searchParams.get('store_id');
    if(requested&&Number(requested)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
    url.searchParams.set('store_id',String(auth.store_id));req=new Request(url,req);
  }
  if(p==='/api/admin/request-blocks'&&auth.role==='store'){
    let requested=url.searchParams.get('store_id');
    if(!requested&& !['GET','HEAD'].includes(req.method)){
      let body={};try{body=await req.clone().json();}catch{}
      requested=body.store_id;
    }
    if(requested&&Number(requested)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
    if(['GET','HEAD'].includes(req.method)){
      url.searchParams.set('store_id',String(auth.store_id));req=new Request(url,req);
    }
  }
  if(p==='/api/admin/requests/on-behalf'&&auth.role==='store'){
    let body={};try{body=await req.clone().json();}catch{}
    if(Number(body.store_id)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
  }

  if(p==='/api/admin/no-go-zones'&&auth.role==='store'){
    if(['GET','HEAD'].includes(req.method)){
      const requested=url.searchParams.get('store_id');
      if(requested&&Number(requested)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
      url.searchParams.set('store_id',String(auth.store_id));req=new Request(url,req);
    }else if(req.method==='POST'){
      let body={};try{body=await req.clone().json();}catch{}
      if(Number(body.store_id)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
    }
  }
  if(p==='/api/admin/holiday-calendar'&&auth.role==='store'){
    const requested=url.searchParams.get('store_id');
    if(requested&&Number(requested)!==auth.store_id)return {response:reply({error:'Store access denied'},403)};
    url.searchParams.set('store_id',String(auth.store_id));req=new Request(url,req);
  }

  const noGoDelete=p.match(/^\/api\/admin\/no-go-zones\/(\d+)$/);
  if(noGoDelete&&auth.role==='store'){
    const row=await env.DB.prepare('SELECT store_id FROM holiday_no_go_zones WHERE id=?').bind(Number(noGoDelete[1])).first();
    if(!row||Number(row.store_id)!==auth.store_id)return {response:reply({error:'No-go zone not found'},404)};
  }

  const requestDelete=p.match(/^\/api\/admin\/requests\/(\d+)$/);
  if(requestDelete&&req.method==='DELETE'){
    const row=await env.DB.prepare('SELECT store_id FROM requests WHERE id=?').bind(Number(requestDelete[1])).first();
    if(!row||(auth.role==='store'&&Number(row.store_id)!==auth.store_id))return {response:reply({error:'Request not found'},404)};
  }

  const decision=p.match(/^\/api\/admin\/requests\/(\d+)\/decision$/);
  if(decision){
    const row=await env.DB.prepare('SELECT store_id FROM requests WHERE id=?').bind(Number(decision[1])).first();
    if(!row||(auth.role==='store'&&row.store_id!==auth.store_id))return {response:reply({error:'Request not found'},404)};
  }

  const allowed =
    p==='/api/admin/stores' ||
    /^\/api\/admin\/stores\/\d+$/.test(p) ||
    cred ||
    p==='/api/admin/managers' ||
    /^\/api\/admin\/managers\/\d+$/.test(p) ||
    p==='/api/admin/approver-emails' ||
    /^\/api\/admin\/approver-emails\/\d+$/.test(p) ||
    /^\/api\/admin\/manager-email\/\d+$/.test(p) ||
    p==='/api/admin/requests' ||
    p==='/api/admin/request-blocks' ||
    p==='/api/admin/requests/on-behalf' ||
    p==='/api/admin/no-go-zones' ||
    /^\/api\/admin\/no-go-zones\/\d+$/.test(p) ||
    p==='/api/admin/holiday-calendar' ||
    (requestDelete && req.method==='DELETE') ||
    decision;
  if(!allowed)return {response:reply({error:'Not found'},404)};
  return {auth,request:req};
}
