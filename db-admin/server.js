// 简易 PostgreSQL 网页管理界面
// 用法：PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE 环境变量指定连接，默认走本机 unix socket 连 demo 库
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

// 时间、数值等类型保持数据库返回的原始文本，避免被 JS 转换后失真
[1082, 1114, 1184, 1700, 20].forEach(oid => types.setTypeParser(oid, v => v));

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.BIND || '127.0.0.1';
const MAX_ROWS = 1000;

const pool = new Pool({
  host: process.env.PGHOST || '/var/run/postgresql',
  database: process.env.PGDATABASE || 'demo',
  max: 4,
});

const page = fs.readFileSync(path.join(__dirname, 'index.html'));

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 1e6) { reject(new Error('请求过大')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function listTables() {
  const { rows } = await pool.query(`
    SELECT c.relname AS name,
           (SELECT count(*) FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = c.relname) AS columns
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname`);
  for (const t of rows) {
    const r = await pool.query(`SELECT count(*) AS n FROM public.${quoteIdent(t.name)}`);
    t.rows = Number(r.rows[0].n);
    t.columns = Number(t.columns);
  }
  return rows;
}

function quoteIdent(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }

async function runQuery(sql) {
  const started = Date.now();
  let result = await pool.query({ text: sql, rowMode: 'array' });
  if (Array.isArray(result)) result = result[result.length - 1]; // 多条语句时取最后一条的结果
  const rows = result.rows || [];
  return {
    command: result.command,
    rowCount: result.rowCount,
    fields: (result.fields || []).map(f => f.name),
    rows: rows.slice(0, MAX_ROWS),
    truncated: rows.length > MAX_ROWS,
    ms: Date.now() - started,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(page);
    }
    if (req.method === 'GET' && url.pathname === '/api/info') {
      const r = await pool.query('SELECT current_database() AS db, current_user AS usr, version() AS version');
      return send(res, 200, r.rows[0]);
    }
    if (req.method === 'GET' && url.pathname === '/api/tables') {
      return send(res, 200, await listTables());
    }
    if (req.method === 'POST' && url.pathname === '/api/query') {
      const { sql } = JSON.parse(await readBody(req) || '{}');
      if (!sql || !sql.trim()) return send(res, 400, { error: 'SQL 不能为空' });
      try {
        return send(res, 200, await runQuery(sql));
      } catch (e) {
        return send(res, 400, { error: e.message, position: e.position, hint: e.hint });
      }
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, HOST, () => console.log(`db-admin 已启动: http://${HOST}:${PORT}`));
