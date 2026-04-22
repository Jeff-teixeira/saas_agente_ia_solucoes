const http = require('http');
const req = http.request({
  hostname: '2.24.199.198',
  port: 8080,
  path: '/api/admin/about',
  method: 'GET'
}, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});
req.on('error', e => console.error(`Error: ${e.message}`));
req.end();
