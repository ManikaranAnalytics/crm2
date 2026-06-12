const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const COPY_ESCAPE_MAP = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  '\\': '\\'
};

function getConnectionString() {
  return process.env.SUPABASE_DB_URL || process.argv[2];
}

function getDumpPath() {
  return process.argv[3] || path.join(__dirname, '..', 'crm_portal_dump.sql');
}

function decodeCopyField(rawValue) {
  if (rawValue === '\\N') {
    return null;
  }

  return rawValue
    .replace(/\\([bfnrtv\\])/g, (_, escapeCode) => COPY_ESCAPE_MAP[escapeCode])
    .replace(/\\([0-7]{3})/g, (_, octalValue) =>
      String.fromCharCode(parseInt(octalValue, 8))
    );
}

function parseCopyHeader(line) {
  const match = line.match(/^COPY\s+(.+?)\s+\((.+)\)\s+FROM stdin;$/i);

  if (!match) {
    throw new Error(`Unsupported COPY header: ${line}`);
  }

  return {
    tableName: match[1].trim(),
    columns: match[2].split(',').map((column) => column.trim())
  };
}

function flushStatement(operations, statementLines) {
  const sql = statementLines.join('\n').trim();
  statementLines.length = 0;

  if (sql) {
    operations.push({ type: 'sql', sql });
  }
}

function parseDumpFile(dumpSql) {
  const operations = [];
  const statementLines = [];
  const lines = dumpSql.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      statementLines.push(line);
      continue;
    }

    if (trimmedLine.startsWith('\\restrict') || trimmedLine.startsWith('\\unrestrict')) {
      continue;
    }

    if (/^COPY\s+/i.test(trimmedLine) && /FROM stdin;$/i.test(trimmedLine)) {
      flushStatement(operations, statementLines);

      const { tableName, columns } = parseCopyHeader(trimmedLine);
      const rows = [];

      index += 1;
      while (index < lines.length && lines[index] !== '\\.') {
        const rawRow = lines[index];
        const parsedRow = rawRow.split('\t').map(decodeCopyField);
        rows.push(parsedRow);
        index += 1;
      }

      operations.push({
        type: 'copy',
        tableName,
        columns,
        rows
      });

      continue;
    }

    statementLines.push(line);
    if (trimmedLine.endsWith(';')) {
      flushStatement(operations, statementLines);
    }
  }

  flushStatement(operations, statementLines);
  return operations;
}

async function executeCopyBlock(client, operation) {
  if (!operation.rows.length) {
    console.log(`Skipping ${operation.tableName}: no rows to import.`);
    return;
  }

  const batchSize = 250;
  console.log(`Importing ${operation.rows.length} rows into ${operation.tableName}...`);

  for (let startIndex = 0; startIndex < operation.rows.length; startIndex += batchSize) {
    const batch = operation.rows.slice(startIndex, startIndex + batchSize);
    const values = [];

    const rowPlaceholders = batch.map((row) => {
      const columnPlaceholders = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });

      return `(${columnPlaceholders.join(', ')})`;
    });

    const insertSql = [
      `INSERT INTO ${operation.tableName} (${operation.columns.join(', ')})`,
      `VALUES ${rowPlaceholders.join(', ')}`
    ].join(' ');

    await client.query(insertSql, values);
  }
}

async function deployDatabase() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    console.error(
      'Provide the Supabase database URL as SUPABASE_DB_URL or as the first script argument.'
    );
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const dumpPath = getDumpPath();

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const dumpSql = fs.readFileSync(dumpPath, 'utf8');
  const operations = parseDumpFile(dumpSql);

  console.log('Connecting to database...');
  const isLocalConnection = /localhost|127\.0\.0\.1/.test(connectionString);
  const client = new Client(
    isLocalConnection
      ? { connectionString }
      : {
          connectionString,
          ssl: {
            rejectUnauthorized: false
          }
        }
  );

  try {
    await client.connect();
    console.log('Connected.');

    await client.query('BEGIN');

    console.log('Applying db/schema.sql...');
    await client.query(schemaSql);

    console.log(`Applying ${operations.length} dump operations from ${path.basename(dumpPath)}...`);
    for (const operation of operations) {
      if (operation.type === 'sql') {
        await client.query(operation.sql);
      } else {
        await executeCopyBlock(client, operation);
      }
    }

    await client.query('COMMIT');
    console.log('Database deployed successfully.');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }

    console.error('Error deploying database:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

deployDatabase();
