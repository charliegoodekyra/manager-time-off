import fs from 'node:fs';
import assert from 'node:assert/strict';

const worker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../src/auth.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

assert.match(worker,/daysInclusive\(\s*start,\s*end\s*\)\s*!==\s*7/s);
assert.match(worker,/count\s*>=\s*2/);
assert.match(worker,/request_type='HOLIDAY'[\s\S]*status='APPROVED'/);
assert.match(worker,/status\s*=\s*'PENDING'/);
assert.match(worker,/APPROVER_EMAILS/);
assert.match(worker,/APPS_SCRIPT_BRIDGE_URL/);
assert.match(auth,/group_admin/);
assert.match(auth,/Use exactly 5 digits/);
assert.match(html,/For hourly-paid managers only/);
assert.match(html,/Day Off requests require manual approval/);
assert.match(worker,/REQUEST_MONTH_CLOSED/);
assert.match(worker,/api\/admin\/request-blocks/);
assert.match(worker,/api\/admin\/requests\/on-behalf/);
assert.match(html,/Close Requests/);
assert.match(html,/Reopen Requests/);
assert.match(html,/Add Request on Behalf of Manager/);
console.log('Holiday Requests smoke checks passed.');
