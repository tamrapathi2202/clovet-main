const http = require('http');

const PORT = process.env.PORT || 5000;

function sendJSON(res, status, obj) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    // CORS preflight
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  if (req.url === '/api/auth/signin' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const data = body ? JSON.parse(body) : {};
      const email = data.email || 'user@example.com';
      // Return a stable stub token and user object
      return sendJSON(res, 200, { token: 'stub-token', user: { id: 'user-1', email } });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.url === '/api/auth/signup' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const data = body ? JSON.parse(body) : {};
      const email = data.email || 'newuser@example.com';
      return sendJSON(res, 201, { token: 'stub-token', user: { id: 'user-2', email } });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.url === '/api/auth/me' && req.method === 'GET') {
    // Check Authorization header for the stub token
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth || String(auth).indexOf('Bearer stub-token') !== 0) {
      return sendJSON(res, 401, { error: 'Unauthorized' });
    }
    // Return user corresponding to stub-token
    return sendJSON(res, 200, { user: { id: 'user-1', email: 'user@example.com' } });
  }

  // Fallback
  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Auth stub running on port ${PORT}`);
});
