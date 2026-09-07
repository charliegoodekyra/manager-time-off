import {guard} from './auth.js';

function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
}
function now(){return new Date().toISOString();}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function slug(v){return String(v||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function parseISODate(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;return new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));}
function isoDate(d){return d.toISOString().slice(0,10);}
function addDays(date,n){const d=new Date(date);d.setUTCDate(d.getUTCDate()+n);return d;}
function daysInclusive(a,b){return Math.round((b-a)/86400000)+1;}
function niceDate(s){const d=parseISODate(s);return d?d.toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}):s;}
function statusColour(status){return ({APPROVED:'#188038',PENDING:'#B77900',REJECTED:'#B3261E',BLOCKED:'#B3261E'})[status]||'#111827';}

async function sendEmail(env,{to,subject,title,message,manager,start,end,status,extra='',buttonText='',buttonUrl=''}) {
  if(!env.RESEND_API_KEY||!to)return {skipped:true};
  const colour=statusColour(status);
  const html=`<!doctype html><html><body style="margin:0;background:#f2f2f2;font-family:Arial,sans-serif;color:#111">
    <div style="max-width:650px;margin:20px auto;background:white">
      <div style="background:#111827;padding:28px 32px;border-bottom:5px solid #FFC72C">
        <div style="font-size:30px;font-weight:800;color:white">Manager Time Off</div>
        <div style="font-size:17px;font-weight:700;color:#FFC72C;margin-top:4px">Kyra Operations</div>
      </div>
      <div style="padding:36px">
        <div style="padding:18px;background:${status==='APPROVED'?'#F0F8F0':status==='PENDING'?'#FFF8E7':'#FFF4F3'};border:1px solid ${colour};border-radius:12px;color:${colour};font-size:20px;font-weight:800">${esc(title)}</div>
        <p style="font-size:18px;margin-top:28px">Hi <b>${esc(manager)}</b>,</p>
        <p style="font-size:16px;line-height:1.6">${message}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#fafafa;border:1px solid #ddd;border-radius:10px">
          <tr><td style="padding:16px;color:#777;font-size:12px">FROM</td><td style="padding:16px;color:#777;font-size:12px">TO</td></tr>
          <tr><td style="padding:0 16px 18px;font-size:18px;font-weight:800">${esc(niceDate(start))}</td><td style="padding:0 16px 18px;font-size:18px;font-weight:800">${esc(niceDate(end))}</td></tr>
        </table>
        ${extra}
        ${buttonUrl?`<div style="margin-top:26px"><a href="${esc(buttonUrl)}" style="display:inline-block;background:#111827;color:white;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:8px">${esc(buttonText)}</a></div>`:''}
        <div style="margin-top:32px;padding-top:18px;border-top:3px solid #FFC72C;color:#777;font-size:12px;text-align:center">Manager Time Off • Kyra Operations</div>
      </div>
    </div></body></html>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({
    from:'Manager Time Off <holidays@kyraops.uk>',to:Array.isArray(to)?to:[to],subject,html
  })});
  return {ok:r.ok,status:r.status,body:await r.text()};
}

async function notifyManager(env,req) {
  const base={to:req.manager_email,manager:req.manager_name,start:req.start_date,end:req.end_date,status:req.status};
  if(req.status==='APPROVED')return sendEmail(env,{...base,subject:'Time off request APPROVED',title:'REQUEST APPROVED',
    message:`Your ${req.request_type==='DAY OFF'?'day off':'holiday'} request has been approved. Your time off has been added to the Manager Holiday Calendar.`});
  if(req.status==='PENDING')return sendEmail(env,{...base,subject:'Day off request PENDING',title:'DAY OFF REQUEST PENDING',
    message:'Your day off request has been received and is awaiting manual approval. You will receive another email when a decision is made.'});
  if(req.status==='BLOCKED')return sendEmail(env,{...base,subject:'Holiday request NOT APPROVED',title:'HOLIDAY REQUEST NOT APPROVED',
    message:'Unfortunately, your holiday request could not be approved because the maximum of 2 approved managers on holiday is already reached during the requested period.',
    extra:`<div style="margin-top:18px;padding:15px;background:#FFF4F3;border-left:4px solid #B3261E">First fully-booked date: <b>${esc(niceDate(req.conflict_date))}</b><br><br>Please choose alternative dates and submit a new request.</div>`});
  return sendEmail(env,{...base,subject:'Time off request NOT APPROVED',title:'REQUEST NOT APPROVED',
    message:`Unfortunately, your ${req.request_type==='DAY OFF'?'day off':'holiday'} request has not been approved.`});
}

async function notifyApprovers(env,req,origin) {
  const to=String(env.APPROVER_EMAILS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!to.length)return {skipped:true};
  return sendEmail(env,{to,manager:req.manager_name,start:req.start_date,end:req.end_date,status:'PENDING',
    subject:`DAY OFF REQUEST - ACTION REQUIRED - ${req.manager_name}`,title:'DAY OFF REQUEST — ACTION REQUIRED',
    message:`A new Day Off request has been submitted for <b>${esc(req.store_name)}</b> and requires manual approval.`,
    extra:`<div style="margin-top:18px;padding:15px;background:#fafafa;border:1px solid #ddd"><b>Notes:</b><br>${esc(req.notes||'No notes provided.')}</div>`,
    buttonText:'OPEN REVIEW PAGE',buttonUrl:`${origin}/admin?request=${req.id}`});
}

async function calendarBridge(env,payload) {
  if(!env.APPS_SCRIPT_BRIDGE_URL||!env.APPS_SCRIPT_BRIDGE_SECRET)return {ok:false,error:'Calendar bridge is not configured'};
  try{
    const r=await fetch(env.APPS_SCRIPT_BRIDGE_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,secret:env.APPS_SCRIPT_BRIDGE_SECRET})});
    const text=await r.text();let j;try{j=JSON.parse(text)}catch{j={ok:false,error:text}}
    return j;
  }catch(e){return {ok:false,error:String(e?.message||e)}}
}

async function createCalendar(env,store,req) {
  const result=await calendarBridge(env,{
    action:'create_event',calendar_name:store.calendar_name||'Manager Holiday Calendar',
    manager:req.manager_name,request_type:req.request_type,start_date:req.start_date,end_date:req.end_date,notes:req.notes||''
  });
  if(result?.ok){
    await env.DB.prepare(`UPDATE requests SET calendar_event_id=?,calendar_sync_status='SYNCED' WHERE id=?`).bind(result.event_id||'',req.id).run();
  }else{
    await env.DB.prepare(`UPDATE requests SET calendar_sync_status='ERROR' WHERE id=?`).bind(req.id).run();
  }
  return result;
}

async function firstHolidayConflict(env,storeId,start,end) {
  const {results}=await env.DB.prepare(`SELECT start_date,end_date FROM requests
    WHERE store_id=? AND request_type='HOLIDAY' AND status='APPROVED'
      AND start_date<=? AND end_date>=?`).bind(storeId,end,start).all();
  for(let d=parseISODate(start),last=parseISODate(end);d<=last;d=addDays(d,1)){
    const ds=isoDate(d);
    let count=0;
    for(const r of results)if(r.start_date<=ds&&r.end_date>=ds)count++;
    if(count>=2)return ds;
  }
  return null;
}

export default {
  async fetch(request,env) {
    try{
      const access=await guard(request,env);
      if(access.response)return access.response;
      request=access.request||request;
      var currentAuth=access.auth||null;
    }catch(e){console.error(e);return json({error:'Authentication unavailable'},503)}
    const url=new URL(request.url),p=url.pathname;
    try{
      if(p==='/api/health')return json({ok:true,db:!!env.DB});

      const publicStore=p.match(/^\/api\/public\/store\/([a-z0-9-]+)$/);
      if(publicStore&&request.method==='GET'){
        const store=await env.DB.prepare('SELECT id,name,slug FROM stores WHERE slug=? AND active=1').bind(publicStore[1]).first();
        if(!store)return json({error:'Store not found'},404);
        const {results:managers}=await env.DB.prepare('SELECT id,name FROM managers WHERE store_id=? AND active=1 ORDER BY name COLLATE NOCASE').bind(store.id).all();
        return json({store,managers});
      }

      if(p==='/api/public/requests'&&request.method==='POST'){
        const body=await request.json();
        const store=await env.DB.prepare('SELECT * FROM stores WHERE id=? AND active=1').bind(Number(body.store_id)).first();
        const manager=await env.DB.prepare('SELECT * FROM managers WHERE id=? AND store_id=? AND active=1').bind(Number(body.manager_id),Number(body.store_id)).first();
        if(!store||!manager)return json({error:'Store or manager is not valid'},400);
        const type=String(body.request_type||'').toUpperCase();
        if(!['HOLIDAY','DAY OFF'].includes(type))return json({error:'Choose Holiday or Day Off'},400);
        const start=parseISODate(body.start_date),end=parseISODate(body.end_date);
        if(!start||!end||end<start)return json({error:'Check the requested dates'},400);
        const notes=String(body.notes||'').trim().slice(0,2000);
        let status='PENDING',conflict=null;
        if(type==='HOLIDAY'){
          if(daysInclusive(start,end)!==7)status='REJECTED';
          else{
            conflict=await firstHolidayConflict(env,store.id,body.start_date,body.end_date);
            status=conflict?'BLOCKED':'APPROVED';
          }
        }
        const submitted=now();
        const ins=await env.DB.prepare(`INSERT INTO requests
          (store_id,manager_id,manager_name,manager_email,request_type,start_date,end_date,status,conflict_date,notes,calendar_sync_status,submitted_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(store.id,manager.id,manager.name,manager.email,type,body.start_date,body.end_date,status,conflict,notes,status==='APPROVED'?'PENDING_SYNC':'NOT_REQUIRED',submitted).run();
        const id=ins.meta.last_row_id;
        const req={id,store_id:store.id,store_name:store.name,manager_name:manager.name,manager_email:manager.email,request_type:type,start_date:body.start_date,end_date:body.end_date,status,conflict_date:conflict,notes};
        let calendar=null;
        if(status==='APPROVED')calendar=await createCalendar(env,store,req);
        await notifyManager(env,req);
        if(status==='PENDING')await notifyApprovers(env,req,url.origin);
        return json({ok:true,request:req,calendar});
      }

      if(p==='/api/admin/stores'&&request.method==='GET'){
        const includeInactive=url.searchParams.get('all')==='1';
        const {results}=await env.DB.prepare(`SELECT id,name,slug,code,email,calendar_name,active,created_at FROM stores ${includeInactive?'':'WHERE active=1'} ORDER BY active DESC,name COLLATE NOCASE`).all();
        return json({stores:results});
      }
      if(p==='/api/admin/stores'&&request.method==='POST'){
        const b=await request.json(),name=String(b.name||'').trim();
        if(!name)return json({error:'Store name is required'},400);
        const s=String(b.slug||slug(name));
        const r=await env.DB.prepare(`INSERT INTO stores(name,slug,code,email,calendar_name,active,created_at) VALUES(?,?,?,?,?,1,?)`)
          .bind(name,s,String(b.code||'').trim().toUpperCase()||null,String(b.email||'').trim()||null,String(b.calendar_name||'Manager Holiday Calendar').trim(),now()).run();
        return json({ok:true,id:r.meta.last_row_id});
      }
      const storeEdit=p.match(/^\/api\/admin\/stores\/(\d+)$/);
      if(storeEdit&&request.method==='PUT'){
        const b=await request.json();
        await env.DB.prepare('UPDATE stores SET name=?,slug=?,code=?,email=?,calendar_name=?,active=? WHERE id=?')
          .bind(String(b.name||'').trim(),String(b.slug||slug(b.name)),String(b.code||'').trim().toUpperCase()||null,String(b.email||'').trim()||null,String(b.calendar_name||'Manager Holiday Calendar').trim(),b.active===false?0:1,Number(storeEdit[1])).run();
        return json({ok:true});
      }

      if(p==='/api/admin/managers'&&request.method==='GET'){
        const storeId=Number(url.searchParams.get('store_id')||0);
        if(!storeId)return json({managers:[]});
        const {results}=await env.DB.prepare('SELECT id,store_id,name,email,active,created_at FROM managers WHERE store_id=? ORDER BY active DESC,name COLLATE NOCASE').bind(storeId).all();
        return json({managers:results});
      }
      if(p==='/api/admin/managers'&&request.method==='POST'){
        const b=await request.json();
        const r=await env.DB.prepare('INSERT INTO managers(store_id,name,email,active,created_at) VALUES(?,?,?,1,?)')
          .bind(Number(b.store_id),String(b.name||'').trim(),String(b.email||'').trim(),now()).run();
        return json({ok:true,id:r.meta.last_row_id});
      }
      const mgrEdit=p.match(/^\/api\/admin\/managers\/(\d+)$/);
      if(mgrEdit&&request.method==='PUT'){
        const b=await request.json();
        await env.DB.prepare('UPDATE managers SET name=?,email=?,active=? WHERE id=?')
          .bind(String(b.name||'').trim(),String(b.email||'').trim(),b.active===false?0:1,Number(mgrEdit[1])).run();
        return json({ok:true});
      }

      if(p==='/api/admin/requests'&&request.method==='GET'){
        const storeId=Number(url.searchParams.get('store_id')||0),status=String(url.searchParams.get('status')||'').toUpperCase();
        let sql=`SELECT r.*,s.name AS store_name FROM requests r JOIN stores s ON s.id=r.store_id WHERE 1=1`,args=[];
        if(storeId){sql+=' AND r.store_id=?';args.push(storeId)}
        if(status&&['PENDING','APPROVED','REJECTED','BLOCKED'].includes(status)){sql+=' AND r.status=?';args.push(status)}
        sql+=' ORDER BY r.submitted_at DESC LIMIT 300';
        let stmt=env.DB.prepare(sql);if(args.length)stmt=stmt.bind(...args);
        const {results}=await stmt.all();return json({requests:results});
      }

      const decision=p.match(/^\/api\/admin\/requests\/(\d+)\/decision$/);
      if(decision&&request.method==='POST'){
        const b=await request.json(),action=String(b.action||'').toUpperCase();
        if(!['APPROVE','REJECT'].includes(action))return json({error:'Choose approve or reject'},400);
        const req=await env.DB.prepare(`SELECT r.*,s.name AS store_name,s.calendar_name FROM requests r JOIN stores s ON s.id=r.store_id WHERE r.id=?`).bind(Number(decision[1])).first();
        if(!req)return json({error:'Request not found'},404);
        if(req.request_type!=='DAY OFF'||req.status!=='PENDING')return json({error:'Only pending Day Off requests can be manually decided'},409);
        const newStatus=action==='APPROVE'?'APPROVED':'REJECTED';
        const decidedBy=currentAuth?.role==='group_admin'?'Group admin':'Store manager';
        await env.DB.prepare(`UPDATE requests SET status=?,decided_at=?,decided_by=?,calendar_sync_status=? WHERE id=?`)
          .bind(newStatus,now(),decidedBy,newStatus==='APPROVED'?'PENDING_SYNC':'NOT_REQUIRED',req.id).run();
        req.status=newStatus;req.decided_by=decidedBy;
        let calendar=null;if(newStatus==='APPROVED')calendar=await createCalendar(env,{calendar_name:req.calendar_name},req);
        await notifyManager(env,req);
        return json({ok:true,request:req,calendar});
      }

      return env.ASSETS.fetch(request);
    }catch(e){console.error(e);return json({error:e?.message||'Server error'},500)}
  }
};
