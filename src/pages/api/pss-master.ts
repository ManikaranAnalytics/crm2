import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { query } from '../../lib/db';

type TransmissionType = 'STU' | 'CTU';

interface PssMasterRow {
  id: number;
  name: string;
  utility: string | null;
  state: string | null;
  capacity_mw: string | null;
  type: string | null;
  technology: string | null;
  transmission_type: TransmissionType | null;
}

interface PssMasterResponse {
  id: number;
  name: string;
  utility: string | null;
  state: string | null;
  capacityMw: number | null;
  type: string | null;
  technology: string | null;
  transmissionType: TransmissionType | null;
}

function mapRow(row: PssMasterRow): PssMasterResponse {
  return {
    id: row.id,
    name: row.name,
    utility: row.utility,
    state: row.state,
    capacityMw: row.capacity_mw == null ? null : Number(row.capacity_mw),
    type: row.type,
    technology: row.technology,
    transmissionType: row.transmission_type ?? null,
  };
}

async function ensureTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS pss_master (
       id SERIAL PRIMARY KEY,
       name TEXT NOT NULL UNIQUE,
       utility TEXT,
       state TEXT,
       capacity_mw NUMERIC(10,2),
       type TEXT,
       technology TEXT,
       transmission_type TEXT CHECK (transmission_type IN ('STU','CTU')),
       created_at TIMESTAMPTZ DEFAULT now(),
       updated_at TIMESTAMPTZ DEFAULT now()
     )`,
  );
}

function parseTransmissionType(utility: string | null): TransmissionType | null {
  if (!utility) return null;
  const u = utility.toUpperCase();
  if (u.includes('CTU')) return 'CTU';
  if (u.includes('STU')) return 'STU';
  return null;
}

function parseTechnology(type: string | null): string | null {
  if (!type) return null;
  const t = type.trim().toUpperCase().replace(/[^A-Z]+/g, '_');
  if (!t) return null;
  if (t === 'SOLAR' || t === 'WIND') return t;
  if (t.includes('SOLAR') && t.includes('WIND') && t.includes('BATTERY')) return 'SOLAR_WIND_BATTERY';
  if (t.includes('SOLAR') && t.includes('WIND')) return 'SOLAR_WIND';
  if (t.includes('SOLAR') && t.includes('BATTERY')) return 'SOLAR_BATTERY';
  if (t.includes('WIND') && t.includes('BATTERY')) return 'WIND_BATTERY';
  if (t.includes('SOLAR')) return 'SOLAR';
  if (t.includes('WIND')) return 'WIND';
  return t;
}

async function seedFromExcelIfEmpty(): Promise<number> {
  const existing = await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM pss_master`);
  if (Number(existing.rows[0]?.c ?? '0') > 0) return 0;

  const candidates = [
    path.resolve(process.cwd(), 'Copy of All PSS.xlsx'),
    path.resolve(process.cwd(), '..', 'Copy of All PSS.xlsx'),
    path.resolve(process.cwd(), 'All PSS List.xlsx'),
  ];
  const excelPath = candidates.find((p) => fs.existsSync(p));
  if (!excelPath) return 0;

  const workbook = XLSX.readFile(excelPath);
  let inserted = 0;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
    if (!rows || rows.length < 2) continue;

    const header = rows[0].map((c) => String(c ?? '').trim().toLowerCase());
    const idxName = header.findIndex((h) => h.includes('pss name') || h === 'name');
    const idxUtility = header.findIndex((h) => h.includes('utility'));
    const idxState = header.findIndex((h) => h.startsWith('state'));
    const idxCapacity = header.findIndex((h) => h.startsWith('capacity'));
    const idxType = header.findIndex((h) => h === 'type' || h.startsWith('type'));
    if (idxName === -1) continue;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row) continue;
      const name = String(row[idxName] ?? '').trim();
      if (!name) continue;
      const utility = idxUtility === -1 ? null : (String(row[idxUtility] ?? '').trim() || null);
      const state = idxState === -1 ? null : (String(row[idxState] ?? '').trim() || null);
      const capRaw = idxCapacity === -1 ? null : row[idxCapacity];
      const capacity =
        capRaw === null || capRaw === undefined || String(capRaw).trim() === ''
          ? null
          : Number.isNaN(Number(capRaw))
          ? null
          : Number(capRaw);
      const type = idxType === -1 ? null : (String(row[idxType] ?? '').trim() || null);
      const technology = parseTechnology(type);
      const transmissionType = parseTransmissionType(utility);

      try {
        await query(
          `INSERT INTO pss_master (name, utility, state, capacity_mw, type, technology, transmission_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (name) DO NOTHING`,
          [name, utility, state, capacity, type, technology, transmissionType],
        );
        inserted += 1;
      } catch {
        // ignore row-level failures to keep seeding resilient
      }
    }
  }
  return inserted;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureTable();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to prepare pss_master table' });
  }

  if (req.method === 'GET') {
    try {
      await seedFromExcelIfEmpty();
      const result = await query<PssMasterRow>(
        `SELECT id, name, utility, state, capacity_mw, type, technology, transmission_type
           FROM pss_master
          ORDER BY name ASC`,
      );
      return res.status(200).json({ pss: result.rows.map(mapRow) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to load master PSS list' });
    }
  }

  if (req.method === 'POST') {
    const modeParam = Array.isArray(req.query.mode) ? req.query.mode[0] : req.query.mode;
    if (modeParam === 'reimport') {
      try {
        const inserted = await seedFromExcelIfEmpty();
        return res.status(200).json({ inserted });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Failed to re-import from Excel' });
      }
    }

    const { name, utility, state, capacityMw, type, technology, transmissionType } = req.body || {};
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (transmissionType && transmissionType !== 'STU' && transmissionType !== 'CTU') {
      return res.status(400).json({ error: 'transmissionType must be STU or CTU' });
    }
    const capVal =
      capacityMw === undefined || capacityMw === null || capacityMw === ''
        ? null
        : Number(capacityMw);
    if (capVal !== null && Number.isNaN(capVal)) {
      return res.status(400).json({ error: 'capacityMw must be a number' });
    }

    try {
      const inserted = await query<PssMasterRow>(
        `INSERT INTO pss_master (name, utility, state, capacity_mw, type, technology, transmission_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, name, utility, state, capacity_mw, type, technology, transmission_type`,
        [
          trimmedName,
          utility || null,
          state || null,
          capVal,
          type || null,
          technology || parseTechnology(type || null),
          transmissionType || parseTransmissionType(utility || null),
        ],
      );
      return res.status(201).json({ pss: mapRow(inserted.rows[0]) });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create PSS' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, name, utility, state, capacityMw, type, technology, transmissionType } = req.body || {};
    const pssId = Number(id);
    if (!pssId || Number.isNaN(pssId)) {
      return res.status(400).json({ error: 'Valid id is required' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (typeof name === 'string' && name.trim()) {
      updates.push(`name = $${idx++}`);
      params.push(name.trim());
    }
    if (utility !== undefined) {
      updates.push(`utility = $${idx++}`);
      params.push(utility || null);
    }
    if (state !== undefined) {
      updates.push(`state = $${idx++}`);
      params.push(state || null);
    }
    if (capacityMw !== undefined) {
      const capVal =
        capacityMw === null || capacityMw === '' ? null : Number(capacityMw);
      if (capVal !== null && Number.isNaN(capVal)) {
        return res.status(400).json({ error: 'capacityMw must be a number' });
      }
      updates.push(`capacity_mw = $${idx++}`);
      params.push(capVal);
    }
    if (type !== undefined) {
      updates.push(`type = $${idx++}`);
      params.push(type || null);
    }
    if (technology !== undefined) {
      updates.push(`technology = $${idx++}`);
      params.push(technology || null);
    }
    if (transmissionType !== undefined) {
      if (
        transmissionType !== null &&
        transmissionType !== '' &&
        transmissionType !== 'STU' &&
        transmissionType !== 'CTU'
      ) {
        return res.status(400).json({ error: 'transmissionType must be STU, CTU or empty' });
      }
      updates.push(`transmission_type = $${idx++}`);
      params.push(transmissionType || null);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(pssId);
    try {
      const updated = await query<PssMasterRow>(
        `UPDATE pss_master
            SET ${updates.join(', ')}, updated_at = now()
          WHERE id = $${idx}
          RETURNING id, name, utility, state, capacity_mw, type, technology, transmission_type`,
        params,
      );
      if (!updated.rows[0]) {
        return res.status(404).json({ error: 'PSS not found' });
      }
      return res.status(200).json({ pss: mapRow(updated.rows[0]) });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update PSS' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const pssId = Number(id);
    if (!pssId || Number.isNaN(pssId)) {
      return res.status(400).json({ error: 'Valid id query parameter is required' });
    }
    try {
      await query('DELETE FROM pss_master WHERE id = $1', [pssId]);
      return res.status(204).end();
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete PSS' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
