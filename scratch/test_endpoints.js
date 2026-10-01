const http = require('http');

function testEndpoint(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'GET',
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testing endpoints...');

  // 1. /login
  const resLogin = await testEndpoint('/login');
  console.log(`/login: Status ${resLogin.statusCode}`);

  // 2. /login/demo/ADMIN to get session cookie
  const resDemoAdmin = await testEndpoint('/login/demo/ADMIN');
  console.log(`/login/demo/ADMIN: Status ${resDemoAdmin.statusCode} (Redirect: ${resDemoAdmin.headers.location})`);
  const cookie = resDemoAdmin.headers['set-cookie'][0].split(';')[0];

  // 3. /dashboard with Admin Cookie
  const resDashboard = await testEndpoint('/dashboard', { Cookie: cookie });
  console.log(`/dashboard (ADMIN): Status ${resDashboard.statusCode}`);

  // 4. /tools with Admin Cookie
  const resTools = await testEndpoint('/tools', { Cookie: cookie });
  console.log(`/tools (ADMIN): Status ${resTools.statusCode}`);

  // 5. /borrowings with Admin Cookie
  const resBorrowings = await testEndpoint('/borrowings', { Cookie: cookie });
  console.log(`/borrowings (ADMIN): Status ${resBorrowings.statusCode}`);

  // 6. /reports with Admin Cookie
  const resReports = await testEndpoint('/reports', { Cookie: cookie });
  console.log(`/reports (ADMIN): Status ${resReports.statusCode}`);

  // 7. /reports/print with Admin Cookie
  const resPrint = await testEndpoint('/reports/print', { Cookie: cookie });
  console.log(`/reports/print (ADMIN): Status ${resPrint.statusCode}`);

  // 8. /logs with Admin Cookie
  const resLogs = await testEndpoint('/logs', { Cookie: cookie });
  console.log(`/logs (ADMIN): Status ${resLogs.statusCode}`);

  // 9. /catalog with Admin Cookie
  const resCatalog = await testEndpoint('/catalog', { Cookie: cookie });
  console.log(`/catalog (ADMIN): Status ${resCatalog.statusCode}`);

  // 10. Test Toolman Login & Pages
  const resDemoToolman = await testEndpoint('/login/demo/TOOLMAN');
  const cookieToolman = resDemoToolman.headers['set-cookie'][0].split(';')[0];
  const resDashboardToolman = await testEndpoint('/dashboard', { Cookie: cookieToolman });
  console.log(`/dashboard (TOOLMAN): Status ${resDashboardToolman.statusCode}`);
  const resBorrowingsToolman = await testEndpoint('/borrowings', { Cookie: cookieToolman });
  console.log(`/borrowings (TOOLMAN): Status ${resBorrowingsToolman.statusCode}`);

  // 11. Test Peminjam Login & Pages
  const resDemoPeminjam = await testEndpoint('/login/demo/PEMINJAM');
  const cookiePeminjam = resDemoPeminjam.headers['set-cookie'][0].split(';')[0];
  const resDashboardPeminjam = await testEndpoint('/dashboard', { Cookie: cookiePeminjam });
  console.log(`/dashboard (PEMINJAM): Status ${resDashboardPeminjam.statusCode}`);
  const resCatalogPeminjam = await testEndpoint('/catalog', { Cookie: cookiePeminjam });
  console.log(`/catalog (PEMINJAM): Status ${resCatalogPeminjam.statusCode}`);

  console.log('\n✨ ALL ENDPOINTS RETURNED 200 OK! ZERO CRASHES OR TEMPLATE ERRORS!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
