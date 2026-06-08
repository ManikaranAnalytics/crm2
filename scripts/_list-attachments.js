const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const m = env.match(/DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/);
const pool = new Pool({ connectionString: m[1].replace(/^"|"$/g, '') });

(async () => {
  const r = await pool.query(
    `SELECT id, owner_type, owner_id, file_name, file_path, content_type, uploaded_by
       FROM attachments
      ORDER BY id DESC`,
  );
  console.table(r.rows);
  await pool.end();
})();
