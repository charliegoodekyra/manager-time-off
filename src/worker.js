import { guard } from './auth.js';

function json(data, status = 200, headers = {}) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...headers
      }
    }
  );
}

function now() {
  return new Date().toISOString();
}

function esc(v) {
  return String(v ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[c]
  );
}

function slug(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseISODate(s) {
  const m = String(s || '').match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!m) return null;

  return new Date(
    Date.UTC(
      +m[1],
      +m[2] - 1,
      +m[3]
    )
  );
}

function isoDate(d) {
  return d
    .toISOString()
    .slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);

  d.setUTCDate(
    d.getUTCDate() + n
  );

  return d;
}

function daysInclusive(a, b) {
  return Math.round(
    (b - a) / 86400000
  ) + 1;
}

function niceDate(s) {
  const d =
    parseISODate(s);

  return d
    ? d.toLocaleDateString(
        'en-GB',
        {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC'
        }
      )
    : s;
}

function statusColour(status) {
  return ({
    APPROVED: '#188038',
    PENDING: '#B77900',
    REJECTED: '#B3261E',
    BLOCKED: '#B3261E'
  })[status] || '#111827';
}


// ============================================================
// EMAIL
// ============================================================

async function sendEmail(
  env,
  {
    to,
    subject,
    title,
    message,
    manager,
    start,
    end,
    status,
    extra = '',
    buttonText = '',
    buttonUrl = ''
  }
) {

  if (
    !env.RESEND_API_KEY ||
    !to
  ) {

    return {
      skipped: true
    };

  }

  const colour =
    statusColour(status);

  const background =
    status === 'APPROVED'
      ? '#F0F8F0'
      : status === 'PENDING'
        ? '#FFF8E7'
        : '#FFF4F3';

  const html = `
<!doctype html>
<html>
<body
  style="
    margin:0;
    background:#f2f2f2;
    font-family:Arial,sans-serif;
    color:#111;
  "
>

  <div
    style="
      max-width:650px;
      margin:20px auto;
      background:white;
    "
  >

    <div
      style="
        background:#111827;
        padding:28px 32px;
        border-bottom:5px solid #FFC72C;
      "
    >

      <div
        style="
          font-size:30px;
          font-weight:800;
          color:white;
        "
      >
        Manager Time Off
      </div>

      <div
        style="
          font-size:17px;
          font-weight:700;
          color:#FFC72C;
          margin-top:4px;
        "
      >
        Kyra Operations
      </div>

    </div>


    <div
      style="
        padding:36px;
      "
    >

      <div
        style="
          padding:18px;
          background:${background};
          border:1px solid ${colour};
          border-radius:12px;
          color:${colour};
          font-size:20px;
          font-weight:800;
        "
      >
        ${esc(title)}
      </div>


      <p
        style="
          font-size:18px;
          margin-top:28px;
        "
      >
        Hi <b>${esc(manager)}</b>,
      </p>


      <p
        style="
          font-size:16px;
          line-height:1.6;
        "
      >
        ${message}
      </p>


      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          margin-top:22px;
          background:#fafafa;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

        <tr>

          <td
            style="
              padding:16px;
              color:#777;
              font-size:12px;
            "
          >
            FROM
          </td>

          <td
            style="
              padding:16px;
              color:#777;
              font-size:12px;
            "
          >
            TO
          </td>

        </tr>


        <tr>

          <td
            style="
              padding:0 16px 18px;
              font-size:18px;
              font-weight:800;
            "
          >
            ${esc(niceDate(start))}
          </td>

          <td
            style="
              padding:0 16px 18px;
              font-size:18px;
              font-weight:800;
            "
          >
            ${esc(niceDate(end))}
          </td>

        </tr>

      </table>


      ${extra}


      ${
        buttonUrl
          ? `
            <div
              style="
                margin-top:26px;
              "
            >
              <a
                href="${esc(buttonUrl)}"
                style="
                  display:inline-block;
                  background:#111827;
                  color:white;
                  text-decoration:none;
                  font-weight:800;
                  padding:13px 20px;
                  border-radius:8px;
                "
              >
                ${esc(buttonText)}
              </a>
            </div>
          `
          : ''
      }


      <div
        style="
          margin-top:32px;
          padding-top:18px;
          border-top:3px solid #FFC72C;
          color:#777;
          font-size:12px;
          text-align:center;
        "
      >
        Manager Time Off • Kyra Operations
      </div>

    </div>

  </div>

</body>
</html>
  `;


  const r =
    await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${env.RESEND_API_KEY}`,

          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify({
            from:
              'Manager Time Off <holidays@kyraops.uk>',

            to:
              Array.isArray(to)
                ? to
                : [to],

            subject,

            html
          })
      }
    );


  return {
    ok: r.ok,
    status: r.status,
    body: await r.text()
  };
}


// ============================================================
// MANAGER EMAILS
// ============================================================

async function notifyManager(
  env,
  req
) {

  const base = {

    to:
      req.manager_email,

    manager:
      req.manager_name,

    start:
      req.start_date,

    end:
      req.end_date,

    status:
      req.status

  };


  if (
    req.status ===
    'APPROVED'
  ) {

    return sendEmail(
      env,
      {
        ...base,

        subject:
          'Time off request APPROVED',

        title:
          'REQUEST APPROVED',

        message:
          `Your ${
            req.request_type ===
            'DAY OFF'
              ? 'day off'
              : 'holiday'
          } request has been approved.`
      }
    );

  }


  if (
    req.status ===
    'PENDING'
  ) {

    return sendEmail(
      env,
      {
        ...base,

        subject:
          'Day off request PENDING',

        title:
          'DAY OFF REQUEST PENDING',

        message:
          'Your day off request has been received and is awaiting manual approval. You will receive another email when a decision is made.'
      }
    );

  }


  if (
    req.status ===
    'BLOCKED'
  ) {

    return sendEmail(
      env,
      {
        ...base,

        subject:
          'Holiday request NOT APPROVED',

        title:
          'HOLIDAY REQUEST NOT APPROVED',

        message:
          'Unfortunately, your holiday request could not be approved because the maximum of 2 approved managers on holiday is already reached during the requested period.',

        extra: `
          <div
            style="
              margin-top:18px;
              padding:15px;
              background:#FFF4F3;
              border-left:4px solid #B3261E;
            "
          >
            First fully-booked date:
            <b>
              ${esc(
                niceDate(
                  req.conflict_date
                )
              )}
            </b>

            <br><br>

            Please choose alternative dates and submit a new request.
          </div>
        `
      }
    );

  }


  return sendEmail(
    env,
    {
      ...base,

      subject:
        'Time off request NOT APPROVED',

      title:
        'REQUEST NOT APPROVED',

      message:
        `Unfortunately, your ${
          req.request_type ===
          'DAY OFF'
            ? 'day off'
            : 'holiday'
        } request has not been approved.`
    }
  );

}


// ============================================================
// APPROVER EMAIL
// ============================================================

async function notifyApprovers(
  env,
  req,
  origin
) {

  let to = [];

  try {
    const { results } = await env.DB.prepare(`
      SELECT email
      FROM store_approver_emails
      WHERE store_id=?
      ORDER BY email COLLATE NOCASE
    `).bind(Number(req.store_id)).all();

    to = (results || [])
      .map(row => String(row.email || '').trim())
      .filter(Boolean);
  } catch (e) {
    console.warn('Could not read store approval emails; using legacy APPROVER_EMAILS setting.', e?.message || e);
  }

  if (!to.length) {
    to = String(env.APPROVER_EMAILS || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  }


  if (
    !to.length
  ) {

    return {
      skipped: true
    };

  }


  return sendEmail(
    env,
    {
      to,

      manager:
        req.manager_name,

      start:
        req.start_date,

      end:
        req.end_date,

      status:
        'PENDING',

      subject:
        `DAY OFF REQUEST - ACTION REQUIRED - ${req.manager_name}`,

      title:
        'DAY OFF REQUEST — ACTION REQUIRED',

      message:
        `A new Day Off request has been submitted for <b>${esc(req.store_name)}</b> and requires manual approval.`,

      extra: `
        <div
          style="
            margin-top:18px;
            padding:15px;
            background:#fafafa;
            border:1px solid #ddd;
          "
        >
          <b>Notes:</b>

          <br>

          ${esc(
            req.notes ||
            'No notes provided.'
          )}
        </div>
      `,

      buttonText:
        'OPEN REVIEW PAGE',

      buttonUrl:
        `${origin}/admin?request=${req.id}`
    }
  );

}


// ============================================================
// HOLIDAY CONFLICT CHECK
// ============================================================

async function firstHolidayConflict(
  env,
  storeId,
  start,
  end
) {

  const { results } =
    await env.DB
      .prepare(`
        SELECT
          start_date,
          end_date
        FROM requests
        WHERE
          store_id=?
          AND request_type='HOLIDAY'
          AND status='APPROVED'
          AND start_date<=?
          AND end_date>=?
      `)
      .bind(
        storeId,
        end,
        start
      )
      .all();


  for (
    let d =
      parseISODate(start),
      last =
        parseISODate(end);

    d <= last;

    d =
      addDays(
        d,
        1
      )
  ) {

    const ds =
      isoDate(d);


    let count =
      0;


    for (
      const r of results
    ) {

      if (
        r.start_date <= ds &&
        r.end_date >= ds
      ) {

        count++;

      }

    }


    if (
      count >= 2
    ) {

      return ds;

    }

  }


  return null;

}



function monthName(month){
  return new Date(Date.UTC(2026, Number(month)-1, 1)).toLocaleDateString(
    'en-GB',
    {month:'long',timeZone:'UTC'}
  );
}

function closedMonthMessage(year,month){
  return `Requests for ${monthName(month)} are now CLOSED, as the schedule is being completed. No further requests can be submitted for this month.`;
}

function monthsCovered(startDate,endDate){
  const start=parseISODate(startDate);
  const end=parseISODate(endDate);
  if(!start||!end||end<start)return [];
  const out=[];
  let y=start.getUTCFullYear();
  let m=start.getUTCMonth()+1;
  const ey=end.getUTCFullYear();
  const em=end.getUTCMonth()+1;
  while(y<ey||(y===ey&&m<=em)){
    out.push({year:y,month:m});
    m++;
    if(m===13){m=1;y++;}
  }
  return out;
}

async function firstClosedMonth(env,storeId,startDate,endDate){
  const months=monthsCovered(startDate,endDate);
  for(const item of months){
    const row=await env.DB.prepare(`
      SELECT id,store_id,year,month,message,blocked_at
      FROM request_month_blocks
      WHERE store_id=? AND year=? AND month=?
      LIMIT 1
    `).bind(storeId,item.year,item.month).first();
    if(row){
      return {
        ...row,
        message: row.message || closedMonthMessage(row.year,row.month)
      };
    }
  }
  return null;
}

function noGoMessage(zone){
  const reason=String(zone?.reason||'').trim();
  return reason
    ? `Holiday requests are not available for the selected dates (${reason}). Please choose alternative dates.`
    : 'Holiday requests are not available for the selected dates due to a restricted booking period. Please choose alternative dates.';
}

async function firstNoGoZone(env,storeId,startDate,endDate){
  return await env.DB.prepare(`
    SELECT id,store_id,start_date,end_date,reason,created_at,created_by
    FROM holiday_no_go_zones
    WHERE store_id=?
      AND start_date<=?
      AND end_date>=?
    ORDER BY start_date ASC,id ASC
    LIMIT 1
  `).bind(storeId,endDate,startDate).first();
}

async function createTimeOffRequest(env,{store,manager,type,startDate,endDate,notes,origin}){
  const start=parseISODate(startDate);
  const end=parseISODate(endDate);
  let status='PENDING';
  let conflict=null;

  if(type==='HOLIDAY'){
    if(daysInclusive(start,end)!==7){
      status='REJECTED';
    }else{
      conflict=await firstHolidayConflict(env,store.id,startDate,endDate);
      status=conflict?'BLOCKED':'APPROVED';
    }
  }

  const submitted=now();
  const ins=await env.DB.prepare(`
    INSERT INTO requests
    (
      store_id,manager_id,manager_name,manager_email,request_type,
      start_date,end_date,status,conflict_date,notes,
      calendar_sync_status,submitted_at
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    store.id,
    manager.id,
    manager.name,
    manager.email,
    type,
    startDate,
    endDate,
    status,
    conflict,
    notes,
    'NOT_REQUIRED',
    submitted
  ).run();

  const req={
    id:ins.meta.last_row_id,
    store_id:store.id,
    store_name:store.name,
    manager_name:manager.name,
    manager_email:manager.email,
    request_type:type,
    start_date:startDate,
    end_date:endDate,
    status,
    conflict_date:conflict,
    notes
  };

  await notifyManager(env,req);
  if(status==='PENDING')await notifyApprovers(env,req,origin);

  return {request:req};
}

// ============================================================
// WORKER
// ============================================================

export default {

  async fetch(
    request,
    env
  ) {

    const incomingUrl =
      new URL(
        request.url
      );


    // ========================================================
    // CLEAN PUBLIC URL
    // ========================================================
    //
    // holiday.kyraops.uk/rothwell
    //
    // safely redirects to the existing tested Rothwell route.
    //

    if (
      incomingUrl.pathname ===
      '/rothwell'
    ) {

      return Response.redirect(
        `${incomingUrl.origin}/request/rothwell-a14-eastbound`,
        302
      );

    }


    // ========================================================
    // AUTH
    // ========================================================

    try {

      const access =
        await guard(
          request,
          env
        );


      if (
        access.response
      ) {

        return access.response;

      }


      request =
        access.request ||
        request;


      var currentAuth =
        access.auth ||
        null;


    } catch (e) {

      console.error(e);


      return json(
        {
          error:
            'Authentication unavailable'
        },
        503
      );

    }


    const url =
      new URL(
        request.url
      );


    const p =
      url.pathname;


    try {

      // ======================================================
      // HEALTH
      // ======================================================

      if (
        p ===
        '/api/health'
      ) {

        return json({
          ok: true,
          db: !!env.DB
        });

      }


      // ======================================================
      // PUBLIC STORE
      // ======================================================

      const publicStore =
        p.match(
          /^\/api\/public\/store\/([a-z0-9-]+)$/
        );


      if (
        publicStore &&
        request.method ===
        'GET'
      ) {

        const store =
          await env.DB
            .prepare(`
              SELECT
                id,
                name,
                slug
              FROM stores
              WHERE
                slug=?
                AND active=1
            `)
            .bind(
              publicStore[1]
            )
            .first();


        if (
          !store
        ) {

          return json(
            {
              error:
                'Store not found'
            },
            404
          );

        }


        const {
          results:
            managers
        } =
          await env.DB
            .prepare(`
              SELECT
                id,
                name
              FROM managers
              WHERE
                store_id=?
                AND active=1
              ORDER BY
                name COLLATE NOCASE
            `)
            .bind(
              store.id
            )
            .all();


        return json({
          store,
          managers
        });

      }


      // ======================================================
      // PUBLIC — UPCOMING HOLIDAY BOOKINGS
      // ======================================================

      const publicBookings=p.match(/^\/api\/public\/managers\/(\d+)\/bookings$/);
      if(publicBookings&&request.method==='GET'){
        const managerId=Number(publicBookings[1]);
        const storeId=Number(url.searchParams.get('store_id')||0);
        const manager=await env.DB.prepare(`
          SELECT id,store_id,name FROM managers
          WHERE id=? AND store_id=? AND active=1
        `).bind(managerId,storeId).first();
        if(!manager)return json({error:'Manager not found'},404);

        const today=new Date().toISOString().slice(0,10);
        const {results}=await env.DB.prepare(`
          SELECT id,start_date,end_date,submitted_at
          FROM requests
          WHERE store_id=?
            AND manager_id=?
            AND request_type='HOLIDAY'
            AND status='APPROVED'
            AND start_date>=?
          ORDER BY start_date ASC,id ASC
          LIMIT 50
        `).bind(storeId,managerId,today).all();

        return json({bookings:results||[]});
      }

      // ======================================================
      // PUBLIC — CHECK CLOSED MONTHS
      // ======================================================

      if (
        p === '/api/public/request-blocks' &&
        request.method === 'GET'
      ) {
        const storeId=Number(url.searchParams.get('store_id')||0);
        const startDate=String(url.searchParams.get('start_date')||'');
        const endDate=String(url.searchParams.get('end_date')||startDate);
        const start=parseISODate(startDate);
        const end=parseISODate(endDate);
        if(!storeId||!start||!end||end<start){
          return json({error:'Store and valid dates are required'},400);
        }
        const block=await firstClosedMonth(env,storeId,startDate,endDate);
        const type=String(url.searchParams.get('request_type')||'').toUpperCase();
        const noGo=type==='HOLIDAY'
          ? await firstNoGoZone(env,storeId,startDate,endDate)
          : null;
        return json({
          closed:!!block,
          block,
          no_go:!!noGo,
          no_go_zone:noGo,
          no_go_message:noGo?noGoMessage(noGo):null
        });
      }

      // ======================================================
      // PUBLIC — READ-ONLY HOLIDAY CALENDAR
      // ======================================================

      if (
        p === '/api/public/holiday-calendar' &&
        request.method === 'GET'
      ) {
        const storeId=Number(url.searchParams.get('store_id')||0);
        const year=Number(url.searchParams.get('year')||0);
        const month=Number(url.searchParams.get('month')||0);
        if(!storeId||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12){
          return json({error:'Store, year and month are required'},400);
        }
        const store=await env.DB.prepare('SELECT id FROM stores WHERE id=? AND active=1').bind(storeId).first();
        if(!store)return json({error:'Store not found'},404);
        const monthStart=`${year}-${String(month).padStart(2,'0')}-01`;
        const nextMonth=month===12?`${year+1}-01-01`:`${year}-${String(month+1).padStart(2,'0')}-01`;
        const {results:holidays}=await env.DB.prepare(`
          SELECT manager_name,start_date,end_date
          FROM requests
          WHERE store_id=?
            AND request_type='HOLIDAY'
            AND status='APPROVED'
            AND start_date<?
            AND end_date>=?
          ORDER BY start_date ASC,manager_name COLLATE NOCASE
        `).bind(storeId,nextMonth,monthStart).all();
        const {results:dayOffs}=await env.DB.prepare(`
          SELECT manager_name,start_date,end_date
          FROM requests
          WHERE store_id=?
            AND request_type='DAY OFF'
            AND status='APPROVED'
            AND start_date<?
            AND end_date>=?
          ORDER BY start_date ASC,manager_name COLLATE NOCASE
        `).bind(storeId,nextMonth,monthStart).all();
        const {results:zones}=await env.DB.prepare(`
          SELECT start_date,end_date,reason
          FROM holiday_no_go_zones
          WHERE store_id=?
            AND start_date<?
            AND end_date>=?
          ORDER BY start_date ASC,id ASC
        `).bind(storeId,nextMonth,monthStart).all();
        return json({holidays:holidays||[],day_offs:dayOffs||[],zones:zones||[]});
      }

      // ======================================================
      // SUBMIT REQUEST
      // ======================================================

      if (
        p ===
          '/api/public/requests' &&
        request.method ===
          'POST'
      ) {

        const body =
          await request.json();


        const store =
          await env.DB
            .prepare(`
              SELECT *
              FROM stores
              WHERE
                id=?
                AND active=1
            `)
            .bind(
              Number(
                body.store_id
              )
            )
            .first();


        const manager =
          await env.DB
            .prepare(`
              SELECT *
              FROM managers
              WHERE
                id=?
                AND store_id=?
                AND active=1
            `)
            .bind(
              Number(
                body.manager_id
              ),
              Number(
                body.store_id
              )
            )
            .first();


        if (
          !store ||
          !manager
        ) {

          return json(
            {
              error:
                'Store or manager is not valid'
            },
            400
          );

        }


        const type =
          String(
            body.request_type ||
            ''
          )
            .toUpperCase();


        if (
          ![
            'HOLIDAY',
            'DAY OFF'
          ].includes(
            type
          )
        ) {

          return json(
            {
              error:
                'Choose Holiday or Day Off'
            },
            400
          );

        }


        const start =
          parseISODate(
            body.start_date
          );


        const end =
          parseISODate(
            body.end_date
          );


        if (
          !start ||
          !end ||
          end < start
        ) {

          return json(
            {
              error:
                'Check the requested dates'
            },
            400
          );

        }


        const closedMonth =
          await firstClosedMonth(
            env,
            store.id,
            body.start_date,
            body.end_date
          );


        if (
          closedMonth
        ) {

          return json(
            {
              error:
                closedMonth.message,
              code:
                'REQUEST_MONTH_CLOSED',
              block:
                closedMonth
            },
            409
          );

        }


        if (type === 'HOLIDAY') {
          const noGo = await firstNoGoZone(
            env,
            store.id,
            body.start_date,
            body.end_date
          );

          if (noGo) {
            return json(
              {
                error: noGoMessage(noGo),
                code: 'HOLIDAY_NO_GO_ZONE',
                no_go_zone: noGo
              },
              409
            );
          }
        }


        const notes =
          String(
            body.notes ||
            ''
          )
            .trim()
            .slice(
              0,
              2000
            );


        let status =
          'PENDING';


        let conflict =
          null;


        if (
          type ===
          'HOLIDAY'
        ) {

          if (
            daysInclusive(
              start,
              end
            ) !== 7
          ) {

            status =
              'REJECTED';

          } else {

            conflict =
              await firstHolidayConflict(
                env,
                store.id,
                body.start_date,
                body.end_date
              );


            status =
              conflict
                ? 'BLOCKED'
                : 'APPROVED';

          }

        }


        const submitted =
          now();


        const ins =
          await env.DB
            .prepare(`
              INSERT INTO requests
              (
                store_id,
                manager_id,
                manager_name,
                manager_email,
                request_type,
                start_date,
                end_date,
                status,
                conflict_date,
                notes,
                calendar_sync_status,
                submitted_at
              )
              VALUES
              (
                ?,?,?,?,?,?,?,?,?,?,?,?
              )
            `)
            .bind(
              store.id,
              manager.id,
              manager.name,
              manager.email,
              type,
              body.start_date,
              body.end_date,
              status,
              conflict,
              notes,
              'NOT_REQUIRED',
              submitted
            )
            .run();


        const id =
          ins.meta
            .last_row_id;


        const req = {

          id,

          store_id:
            store.id,

          store_name:
            store.name,

          manager_name:
            manager.name,

          manager_email:
            manager.email,

          request_type:
            type,

          start_date:
            body.start_date,

          end_date:
            body.end_date,

          status,

          conflict_date:
            conflict,

          notes

        };


        await notifyManager(
          env,
          req
        );


        if (
          status ===
          'PENDING'
        ) {

          await notifyApprovers(
            env,
            req,
            url.origin
          );

        }


        return json({
          ok: true,
          request: req
        });

      }


      // ======================================================
      // STORES — GET
      // ======================================================

      if (
        p ===
          '/api/admin/stores' &&
        request.method ===
          'GET'
      ) {

        const includeInactive =
          url.searchParams
            .get(
              'all'
            ) ===
          '1';


        const {
          results
        } =
          await env.DB
            .prepare(`
              SELECT
                id,
                name,
                slug,
                code,
                email,
                calendar_name,
                active,
                created_at
              FROM stores

              ${
                includeInactive
                  ? ''
                  : 'WHERE active=1'
              }

              ORDER BY
                active DESC,
                name COLLATE NOCASE
            `)
            .all();


        return json({
          stores:
            results
        });

      }


      // ======================================================
      // STORES — ADD
      // ======================================================

      if (
        p ===
          '/api/admin/stores' &&
        request.method ===
          'POST'
      ) {

        const b =
          await request.json();


        const name =
          String(
            b.name ||
            ''
          )
            .trim();


        if (
          !name
        ) {

          return json(
            {
              error:
                'Store name is required'
            },
            400
          );

        }


        const s =
          String(
            b.slug ||
            slug(name)
          );


        const r =
          await env.DB
            .prepare(`
              INSERT INTO stores
              (
                name,
                slug,
                code,
                email,
                active,
                created_at
              )
              VALUES
              (
                ?,?,?,?,1,?
              )
            `)
            .bind(
              name,
              s,
              String(
                b.code ||
                ''
              )
                .trim()
                .toUpperCase() ||
                null,
              String(
                b.email ||
                ''
              )
                .trim() ||
                null,
              now()
            )
            .run();


        return json({
          ok: true,
          id:
            r.meta
              .last_row_id
        });

      }


      // ======================================================
      // STORE EDIT
      // ======================================================

      const storeEdit =
        p.match(
          /^\/api\/admin\/stores\/(\d+)$/
        );


      if (
        storeEdit &&
        request.method ===
        'PUT'
      ) {

        const b =
          await request.json();


        await env.DB
          .prepare(`
            UPDATE stores
            SET
              name=?,
              slug=?,
              code=?,
              email=?,
              active=?
            WHERE id=?
          `)
          .bind(
            String(
              b.name ||
              ''
            )
              .trim(),

            String(
              b.slug ||
              slug(
                b.name
              )
            ),

            String(
              b.code ||
              ''
            )
              .trim()
              .toUpperCase() ||
              null,

            String(
              b.email ||
              ''
            )
              .trim() ||
              null,

            b.active ===
              false
              ? 0
              : 1,

            Number(
              storeEdit[1]
            )
          )
          .run();


        return json({
          ok: true
        });

      }


      // ======================================================
      // APPROVAL EMAILS — BY STORE
      // ======================================================

      if (
        p === '/api/admin/approver-emails' &&
        request.method === 'GET'
      ) {
        const storeId = Number(url.searchParams.get('store_id') || 0);
        if (!storeId) return json({ emails: [] });

        let { results } = await env.DB.prepare(`
          SELECT id,store_id,email,created_at
          FROM store_approver_emails
          WHERE store_id=?
          ORDER BY email COLLATE NOCASE
        `).bind(storeId).all();

        // First-use migration for this store from the old Worker variable.
        if (!(results || []).length) {
          const legacy = String(env.APPROVER_EMAILS || '')
            .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
          for (const email of [...new Set(legacy)]) {
            await env.DB.prepare(`
              INSERT OR IGNORE INTO store_approver_emails(store_id,email,created_at)
              VALUES(?,?,?)
            `).bind(storeId,email,now()).run();
          }
          ({ results } = await env.DB.prepare(`
            SELECT id,store_id,email,created_at
            FROM store_approver_emails
            WHERE store_id=?
            ORDER BY email COLLATE NOCASE
          `).bind(storeId).all());
        }

        return json({ emails: results || [] });
      }

      if (
        p === '/api/admin/approver-emails' &&
        request.method === 'POST'
      ) {
        const b = await request.json();
        const storeId = Number(b.store_id || 0);
        const email = String(b.email || '').trim().toLowerCase();
        if (!storeId) return json({ error:'Choose a store' },400);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error:'Enter a valid email address' },400);
        try {
          const r = await env.DB.prepare(`
            INSERT INTO store_approver_emails(store_id,email,created_at)
            VALUES(?,?,?)
          `).bind(storeId,email,now()).run();
          return json({ ok:true,id:r.meta.last_row_id });
        } catch (e) {
          if (String(e?.message || e).toLowerCase().includes('unique')) return json({ error:'That approval email is already listed for this store' },409);
          throw e;
        }
      }

      const approverEmailEdit = p.match(/^\/api\/admin\/approver-emails\/(\d+)$/);
      if (approverEmailEdit && request.method === 'PUT') {
        const b = await request.json();
        const email = String(b.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error:'Enter a valid email address' },400);
        const found = await env.DB.prepare('SELECT id FROM store_approver_emails WHERE id=?').bind(Number(approverEmailEdit[1])).first();
        if (!found) return json({ error:'Approval email not found' },404);
        try {
          await env.DB.prepare('UPDATE store_approver_emails SET email=? WHERE id=?').bind(email,Number(approverEmailEdit[1])).run();
          return json({ ok:true });
        } catch (e) {
          if (String(e?.message || e).toLowerCase().includes('unique')) return json({ error:'That approval email is already listed for this store' },409);
          throw e;
        }
      }

      if (approverEmailEdit && request.method === 'DELETE') {
        const row = await env.DB.prepare('SELECT store_id FROM store_approver_emails WHERE id=?').bind(Number(approverEmailEdit[1])).first();
        if (!row) return json({ error:'Approval email not found' },404);
        const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM store_approver_emails WHERE store_id=?').bind(Number(row.store_id)).first();
        if (Number(count?.total || 0) <= 1) return json({ error:'At least one approval email must remain.' },409);
        await env.DB.prepare('DELETE FROM store_approver_emails WHERE id=?').bind(Number(approverEmailEdit[1])).run();
        return json({ ok:true });
      }

      const managerEmailEdit = p.match(/^\/api\/admin\/manager-email\/(\d+)$/);
      if (managerEmailEdit && request.method === 'PUT') {
        const b = await request.json();
        const email = String(b.email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error:'Enter a valid email address' },400);
        const found = await env.DB.prepare('SELECT id FROM managers WHERE id=?').bind(Number(managerEmailEdit[1])).first();
        if (!found) return json({ error:'Manager not found' },404);
        await env.DB.prepare('UPDATE managers SET email=? WHERE id=?').bind(email,Number(managerEmailEdit[1])).run();
        return json({ ok:true });
      }


      // ======================================================
      // MANAGERS — GET
      // ======================================================

      if (
        p ===
          '/api/admin/managers' &&
        request.method ===
          'GET'
      ) {

        const storeId =
          Number(
            url.searchParams
              .get(
                'store_id'
              ) ||
            0
          );


        if (
          !storeId
        ) {

          return json({
            managers: []
          });

        }


        const {
          results
        } =
          await env.DB
            .prepare(`
              SELECT
                id,
                store_id,
                name,
                email,
                active,
                created_at
              FROM managers
              WHERE store_id=?
              ORDER BY
                active DESC,
                name COLLATE NOCASE
            `)
            .bind(
              storeId
            )
            .all();


        return json({
          managers:
            results
        });

      }


      // ======================================================
      // MANAGERS — ADD
      // ======================================================

      if (
        p ===
          '/api/admin/managers' &&
        request.method ===
          'POST'
      ) {

        const b =
          await request.json();


        const r =
          await env.DB
            .prepare(`
              INSERT INTO managers
              (
                store_id,
                name,
                email,
                active,
                created_at
              )
              VALUES
              (
                ?,?,?,1,?
              )
            `)
            .bind(
              Number(
                b.store_id
              ),
              String(
                b.name ||
                ''
              )
                .trim(),
              String(
                b.email ||
                ''
              )
                .trim(),
              now()
            )
            .run();


        return json({
          ok: true,
          id:
            r.meta
              .last_row_id
        });

      }


      // ======================================================
      // MANAGER EDIT
      // ======================================================

      const mgrEdit =
        p.match(
          /^\/api\/admin\/managers\/(\d+)$/
        );


      if (
        mgrEdit &&
        request.method ===
        'PUT'
      ) {

        const b =
          await request.json();


        await env.DB
          .prepare(`
            UPDATE managers
            SET
              name=?,
              email=?,
              active=?
            WHERE id=?
          `)
          .bind(
            String(
              b.name ||
              ''
            )
              .trim(),

            String(
              b.email ||
              ''
            )
              .trim(),

            b.active ===
              false
              ? 0
              : 1,

            Number(
              mgrEdit[1]
            )
          )
          .run();


        return json({
          ok: true
        });

      }


      // ======================================================
      // REQUEST MONTH CONTROLS — ADMIN
      // ======================================================

      if (
        p === '/api/admin/request-blocks' &&
        request.method === 'GET'
      ) {
        const storeId=Number(url.searchParams.get('store_id')||0);
        const year=Number(url.searchParams.get('year')||0);
        const month=Number(url.searchParams.get('month')||0);
        if(!storeId||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12){
          return json({error:'Store, year and month are required'},400);
        }
        const block=await env.DB.prepare(`
          SELECT id,store_id,year,month,message,blocked_at
          FROM request_month_blocks
          WHERE store_id=? AND year=? AND month=?
          LIMIT 1
        `).bind(storeId,year,month).first();
        return json({
          closed:!!block,
          block:block?{...block,message:block.message||closedMonthMessage(year,month)}:null,
          message:block?(block.message||closedMonthMessage(year,month)):null
        });
      }

      if (
        p === '/api/admin/request-blocks' &&
        request.method === 'PUT'
      ) {
        const b=await request.json();
        const storeId=Number(b.store_id||0);
        const year=Number(b.year||0);
        const month=Number(b.month||0);
        if(!storeId||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12){
          return json({error:'Store, year and month are required'},400);
        }
        const store=await env.DB.prepare('SELECT id FROM stores WHERE id=? AND active=1').bind(storeId).first();
        if(!store)return json({error:'Store not found'},404);
        const message=closedMonthMessage(year,month);
        await env.DB.prepare(`
          INSERT INTO request_month_blocks(store_id,year,month,message,blocked_at)
          VALUES(?,?,?,?,?)
          ON CONFLICT(store_id,year,month)
          DO UPDATE SET message=excluded.message,blocked_at=excluded.blocked_at
        `).bind(storeId,year,month,message,now()).run();
        return json({ok:true,closed:true,message});
      }

      if (
        p === '/api/admin/request-blocks' &&
        request.method === 'DELETE'
      ) {
        const b=await request.json();
        const storeId=Number(b.store_id||0);
        const year=Number(b.year||0);
        const month=Number(b.month||0);
        if(!storeId||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12){
          return json({error:'Store, year and month are required'},400);
        }
        await env.DB.prepare(`
          DELETE FROM request_month_blocks
          WHERE store_id=? AND year=? AND month=?
        `).bind(storeId,year,month).run();
        return json({ok:true,closed:false});
      }

      // ======================================================
      // ADD REQUEST ON BEHALF OF MANAGER — ADMIN
      // ======================================================

      if (
        p === '/api/admin/requests/on-behalf' &&
        request.method === 'POST'
      ) {
        const body=await request.json();
        const store=await env.DB.prepare(`
          SELECT * FROM stores WHERE id=? AND active=1
        `).bind(Number(body.store_id)).first();
        const manager=await env.DB.prepare(`
          SELECT * FROM managers
          WHERE id=? AND store_id=? AND active=1
        `).bind(Number(body.manager_id),Number(body.store_id)).first();
        if(!store||!manager)return json({error:'Store or manager is not valid'},400);

        const type=String(body.request_type||'').toUpperCase();
        if(!['HOLIDAY','DAY OFF'].includes(type))return json({error:'Choose Holiday or Day Off'},400);
        const start=parseISODate(body.start_date);
        const end=parseISODate(body.end_date);
        if(!start||!end||end<start)return json({error:'Check the requested dates'},400);
        const notes=String(body.notes||'').trim().slice(0,2000);

        if(type==='HOLIDAY'){
          const noGo=await firstNoGoZone(env,store.id,body.start_date,body.end_date);
          if(noGo)return json({error:noGoMessage(noGo),code:'HOLIDAY_NO_GO_ZONE',no_go_zone:noGo},409);
        }

        // Deliberately bypasses month closure: authorised admin exception.
        // No-go zones still apply to Holiday requests.
        const result=await createTimeOffRequest(env,{
          store,
          manager,
          type,
          startDate:body.start_date,
          endDate:body.end_date,
          notes,
          origin:url.origin
        });
        return json({ok:true,...result,added_on_behalf:true});
      }

      // ======================================================
      // HOLIDAY NO-GO ZONES — ADMIN
      // ======================================================

      if (
        p === '/api/admin/no-go-zones' &&
        request.method === 'GET'
      ) {
        const storeId=Number(url.searchParams.get('store_id')||0);
        const year=Number(url.searchParams.get('year')||0);
        const month=Number(url.searchParams.get('month')||0);
        if(!storeId||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12){
          return json({error:'Store, year and month are required'},400);
        }
        const monthStart=`${year}-${String(month).padStart(2,'0')}-01`;
        const nextMonth=month===12?`${year+1}-01-01`:`${year}-${String(month+1).padStart(2,'0')}-01`;
        const {results}=await env.DB.prepare(`
          SELECT id,store_id,start_date,end_date,reason,created_at,created_by
          FROM holiday_no_go_zones
          WHERE store_id=?
            AND start_date<?
            AND end_date>=?
          ORDER BY start_date ASC,id ASC
        `).bind(storeId,nextMonth,monthStart).all();
        return json({zones:results||[]});
      }

      if (
        p === '/api/admin/no-go-zones' &&
        request.method === 'POST'
      ) {
        const b=await request.json();
        const storeId=Number(b.store_id||0);
        const startDate=String(b.start_date||'');
        const endDate=String(b.end_date||'');
        const start=parseISODate(startDate);
        const end=parseISODate(endDate);
        if(!storeId||!start||!end||end<start){
          return json({error:'Store and valid dates are required'},400);
        }
        const store=await env.DB.prepare('SELECT id FROM stores WHERE id=? AND active=1').bind(storeId).first();
        if(!store)return json({error:'Store not found'},404);
        const reason=String(b.reason||'').trim().slice(0,500);
        const createdBy=currentAuth?.role==='group_admin'?'Group admin':'Store manager';
        const result=await env.DB.prepare(`
          INSERT INTO holiday_no_go_zones(store_id,start_date,end_date,reason,created_at,created_by)
          VALUES(?,?,?,?,?,?)
        `).bind(storeId,startDate,endDate,reason||null,now(),createdBy).run();
        return json({ok:true,id:result.meta.last_row_id});
      }

      const noGoDelete=p.match(/^\/api\/admin\/no-go-zones\/(\d+)$/);
      if(noGoDelete&&request.method==='DELETE'){
        const id=Number(noGoDelete[1]);
        const row=await env.DB.prepare('SELECT store_id FROM holiday_no_go_zones WHERE id=?').bind(id).first();
        if(!row)return json({error:'No-go zone not found'},404);
        if(currentAuth?.role==='store'&&Number(row.store_id)!==Number(currentAuth.store_id)){
          return json({error:'Store access denied'},403);
        }
        await env.DB.prepare('DELETE FROM holiday_no_go_zones WHERE id=?').bind(id).run();
        return json({ok:true});
      }

      // ======================================================
      // HOLIDAY CALENDAR — ADMIN
      // ======================================================

      if(
        p === '/api/admin/holiday-calendar' &&
        request.method === 'GET'
      ){
        const storeId=Number(url.searchParams.get('store_id')||0);
        const year=Number(url.searchParams.get('year')||0);
        const month=Number(url.searchParams.get('month')||0);
        if(!storeId||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12){
          return json({error:'Store, year and month are required'},400);
        }
        const monthStart=`${year}-${String(month).padStart(2,'0')}-01`;
        const nextMonth=month===12?`${year+1}-01-01`:`${year}-${String(month+1).padStart(2,'0')}-01`;
        const {results:holidays}=await env.DB.prepare(`
          SELECT id,manager_id,manager_name,start_date,end_date,notes,status
          FROM requests
          WHERE store_id=?
            AND request_type='HOLIDAY'
            AND status='APPROVED'
            AND start_date<?
            AND end_date>=?
          ORDER BY start_date ASC,manager_name COLLATE NOCASE
        `).bind(storeId,nextMonth,monthStart).all();
        const {results:dayOffs}=await env.DB.prepare(`
          SELECT id,manager_id,manager_name,start_date,end_date,notes,status
          FROM requests
          WHERE store_id=?
            AND request_type='DAY OFF'
            AND status='APPROVED'
            AND start_date<?
            AND end_date>=?
          ORDER BY start_date ASC,manager_name COLLATE NOCASE
        `).bind(storeId,nextMonth,monthStart).all();
        const {results:zones}=await env.DB.prepare(`
          SELECT id,start_date,end_date,reason,created_at,created_by
          FROM holiday_no_go_zones
          WHERE store_id=?
            AND start_date<?
            AND end_date>=?
          ORDER BY start_date ASC,id ASC
        `).bind(storeId,nextMonth,monthStart).all();
        return json({holidays:holidays||[],day_offs:dayOffs||[],zones:zones||[]});
      }

      // ======================================================
      // DELETE FUTURE REQUEST — ADMIN
      // ======================================================

      const deleteRequest=p.match(/^\/api\/admin\/requests\/(\d+)$/);
      if(deleteRequest&&request.method==='DELETE'){
        const id=Number(deleteRequest[1]);
        const row=await env.DB.prepare(`
          SELECT id,store_id,manager_name,request_type,start_date,end_date,status
          FROM requests WHERE id=?
        `).bind(id).first();
        if(!row)return json({error:'Request not found'},404);
        if(currentAuth?.role==='store'&&Number(row.store_id)!==Number(currentAuth.store_id)){
          return json({error:'Request not found'},404);
        }
        const today=new Date().toISOString().slice(0,10);
        if(String(row.start_date)<today){
          return json({error:'Only future requests can be deleted'},409);
        }
        await env.DB.prepare('DELETE FROM requests WHERE id=?').bind(id).run();
        return json({ok:true,deleted:row});
      }

      // ======================================================
      // REQUESTS — ADMIN LIST
      // ======================================================

      if (
        p ===
          '/api/admin/requests' &&
        request.method ===
          'GET'
      ) {

        const storeId =
          Number(
            url.searchParams
              .get(
                'store_id'
              ) ||
            0
          );


        const status =
          String(
            url.searchParams
              .get(
                'status'
              ) ||
            ''
          )
            .toUpperCase();


        let sql = `
          SELECT
            r.*,
            s.name AS store_name
          FROM requests r
          JOIN stores s
            ON s.id=r.store_id
          WHERE 1=1
        `;


        const args =
          [];


        if (
          storeId
        ) {

          sql +=
            ' AND r.store_id=?';

          args.push(
            storeId
          );

        }


        if (
          status &&
          [
            'PENDING',
            'APPROVED',
            'REJECTED',
            'BLOCKED'
          ].includes(
            status
          )
        ) {

          sql +=
            ' AND r.status=?';

          args.push(
            status
          );

        }


        sql += `
          ORDER BY
            r.submitted_at DESC
          LIMIT 300
        `;


        let stmt =
          env.DB
            .prepare(
              sql
            );


        if (
          args.length
        ) {

          stmt =
            stmt.bind(
              ...args
            );

        }


        const {
          results
        } =
          await stmt.all();


        return json({
          requests:
            results
        });

      }


      // ======================================================
      // APPROVE / REJECT DAY OFF
      // ======================================================

      const decision =
        p.match(
          /^\/api\/admin\/requests\/(\d+)\/decision$/
        );


      if (
        decision &&
        request.method ===
          'POST'
      ) {

        const b =
          await request.json();


        const action =
          String(
            b.action ||
            ''
          )
            .toUpperCase();


        if (
          ![
            'APPROVE',
            'REJECT'
          ].includes(
            action
          )
        ) {

          return json(
            {
              error:
                'Choose approve or reject'
            },
            400
          );

        }


        const req =
          await env.DB
            .prepare(`
              SELECT
                r.*,
                s.name AS store_name
              FROM requests r
              JOIN stores s
                ON s.id=r.store_id
              WHERE r.id=?
            `)
            .bind(
              Number(
                decision[1]
              )
            )
            .first();


        if (
          !req
        ) {

          return json(
            {
              error:
                'Request not found'
            },
            404
          );

        }


        if (
          req.request_type !==
            'DAY OFF' ||
          req.status !==
            'PENDING'
        ) {

          return json(
            {
              error:
                'Only pending Day Off requests can be manually decided'
            },
            409
          );

        }


        const newStatus =
          action ===
            'APPROVE'
            ? 'APPROVED'
            : 'REJECTED';


        const decidedBy =
          currentAuth?.role ===
            'group_admin'
            ? 'Group admin'
            : 'Store manager';


        await env.DB
          .prepare(`
            UPDATE requests
            SET
              status=?,
              decided_at=?,
              decided_by=?,
              calendar_sync_status=?
            WHERE id=?
          `)
          .bind(
            newStatus,
            now(),
            decidedBy,

            'NOT_REQUIRED',

            req.id
          )
          .run();


        req.status =
          newStatus;


        req.decided_by =
          decidedBy;

        await notifyManager(
          env,
          req
        );


        return json({
          ok: true,
          request: req
        });

      }


      // ======================================================
      // FRONT-END
      // ======================================================

      return env.ASSETS.fetch(
        request
      );


    } catch (e) {

      console.error(e);


      return json(
        {
          error:
            e?.message ||
            'Server error'
        },
        500
      );

    }

  }

};
