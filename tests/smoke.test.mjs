import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../src/auth.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../schema.sql',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('../google-calendar-bridge/Code.gs',import.meta.url),'utf8');

const must=(text,needle,label)=>{if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`);};

must(worker,"/api/public/request-blocks",'public month-block endpoint');
must(worker,"/api/admin/request-blocks",'admin month-block endpoint');
must(worker,"/api/admin/requests/on-behalf",'on-behalf endpoint');
must(worker,"/bookings",'upcoming booking endpoint');
must(worker,"deleteCalendar",'calendar deletion helper');
must(auth,"/bookings",'public bookings auth allowance');
must(schema,"request_month_blocks",'month block schema');
must(html,"Close Requests",'close request control');
must(html,"Reopen Requests",'reopen request control');
must(html,"Add Request on Behalf of Manager",'on behalf control');
must(html,"Multiple consecutive weeks must be booked separately.",'consecutive week hint');
must(html,"Upcoming holiday bookings",'upcoming bookings UI');
must(html,"Remove week",'remove booking UI');
must(bridge,"delete_event",'calendar bridge delete action');

console.log('Manager Time Off smoke checks passed.');
