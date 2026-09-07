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
must(auth,"/bookings",'public bookings auth allowance');
must(schema,"request_month_blocks",'month block schema');
must(html,"Close Requests",'close request control');
must(html,"Reopen Requests",'reopen request control');
must(html,"Add Request on Behalf of Manager",'on behalf control');
must(html,"Multiple consecutive weeks must be booked separately.",'consecutive week hint');
must(html,"Your upcoming approved holidays",'upcoming bookings UI');

console.log('Manager Time Off smoke checks passed.');

if(html.includes('Remove week')) throw new Error('Remove week UI should not exist');
if(worker.includes("action:'delete_event'")) throw new Error('delete_event worker action should not exist');
