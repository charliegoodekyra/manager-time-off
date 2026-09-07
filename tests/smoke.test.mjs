import fs from 'node:fs';
import assert from 'node:assert/strict';

const worker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../src/auth.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

assert.match(worker,/daysInclusive\(start,end\)!==7/);
assert.match(worker,/count>=2/);
assert.match(worker,/request_type='HOLIDAY' AND status='APPROVED'/);
assert.match(worker,/status='PENDING'/);
assert.match(worker,/APPROVER_EMAILS/);
assert.match(worker,/APPS_SCRIPT_BRIDGE_URL/);
assert.match(auth,/group_admin/);
assert.match(auth,/Use exactly 5 digits/);
assert.match(html,/For hourly-paid managers only/);
assert.match(html,/Day Off requests require manual approval/);
console.log('Holiday Requests smoke checks passed.');
