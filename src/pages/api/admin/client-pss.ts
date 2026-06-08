import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { query } from '../../../lib/db';

type Technology =
  | 'SOLAR'
  | 'WIND'
  | 'SOLAR_WIND'
  | 'SOLAR_WIND_BATTERY'
  | 'SOLAR_BATTERY'
  | 'WIND_BATTERY';

type TransmissionType = 'STU' | 'CTU';

interface ClientPssRow {
  id: number;
  client_id: number;
  name: string;
  state: string | null;
  capacity_mw: string | null;
  technology: Technology | null;
  sps: boolean;
  aggregation: boolean;
  transmission_type: TransmissionType | null;
}

interface ClientPssResponse {
  id: number;
  clientId: number;
  name: string;
  state: string | null;
  capacityMw: number | null;
  technology: Technology | null;
  sps: boolean;
  aggregation: boolean;
  transmissionType: TransmissionType | null;
}

function mapPss(row: ClientPssRow): ClientPssResponse {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    state: row.state,
    capacityMw: row.capacity_mw == null ? null : Number(row.capacity_mw),
    technology: row.technology,
    sps: row.sps,
    aggregation: row.aggregation,
    transmissionType: row.transmission_type ?? null,
  };
}

async function importPssFromExcel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const clientIdParam = Array.isArray(req.query.clientId)
      ? req.query.clientId[0]
      : req.query.clientId;
    const clientIdNum = clientIdParam ? Number(clientIdParam) : NaN;

    if (!clientIdParam || Number.isNaN(clientIdNum) || clientIdNum <= 0) {
      return res
        .status(400)
        .json({ error: 'clientId query parameter (positive number) is required for import' });
    }

    const excelPath = path.resolve(process.cwd(), '..', 'All PSS List.xlsx');
    await fs.promises.access(excelPath);

    const workbook = XLSX.readFile(excelPath);

    const createdIds: number[] = [];
    const skipped: { name: string; reason: string }[] = [];
    let totalRows = 0;

    const normalize = (value: unknown) =>
      String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
      if (!rows || rows.length < 2) continue;

      const headerRow = rows[0].map((cell) => String(cell ?? '').trim());

      const idxName = headerRow.findIndex((h) => normalize(h).includes('pss name'));
      const idxUtility = headerRow.findIndex((h) => normalize(h).includes('utility'));
      const idxState = headerRow.findIndex((h) => normalize(h).startsWith('state'));
      const idxCapacity = headerRow.findIndex((h) => normalize(h).startsWith('capacity'));

      if (idxName === -1) {
        continue;
      }

      const sheetLower = sheetName.toLowerCase();
      let technology: Technology | null = null;
      if (sheetLower.includes('solar') && sheetLower.includes('wind')) {
        technology = 'SOLAR_WIND';
      } else if (sheetLower.includes('solar')) {
        technology = 'SOLAR';
      } else if (sheetLower.includes('wind')) {
        technology = 'WIND';
      }

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i] as unknown[];
        if (!row) continue;

        const rawName = row[idxName];
        const name = String(rawName ?? '').trim();
        if (!name) continue;

        totalRows += 1;

        const rawUtility = idxUtility === -1 ? undefined : row[idxUtility];
        const utility = String(rawUtility ?? '').trim().toUpperCase();
        let transmissionType: TransmissionType | null = null;
        if (utility === 'CTU' || utility === 'STU') {
          transmissionType = utility as TransmissionType;
        }

        const rawState = idxState === -1 ? undefined : row[idxState];
        const state = (() => {
          const v = String(rawState ?? '').trim();
          return v || null;
        })();

        const rawCapacity = idxCapacity === -1 ? undefined : row[idxCapacity];
        let capacity: number | null = null;
        if (rawCapacity !== undefined && rawCapacity !== null && String(rawCapacity).trim() !== '') {
          const parsed = Number(rawCapacity);
          capacity = Number.isNaN(parsed) ? null : parsed;
        }

        const existing = await query<{ id: number }>(
          `SELECT id
             FROM client_pss
            WHERE client_id = $1
              AND name = $2
              AND (state = $3 OR (state IS NULL AND $3 IS NULL))
              AND (transmission_type = $4 OR (transmission_type IS NULL AND $4 IS NULL))
            LIMIT 1`,
          [clientIdNum, name, state, transmissionType],
        );

        if (existing.rows[0]) {
          skipped.push({ name, reason: 'Already exists for this client' });
          continue;
        }

        const inserted = await query<ClientPssRow>(
          `INSERT INTO client_pss (client_id, name, state, capacity_mw, technology, sps, aggregation, transmission_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, client_id, name, state, capacity_mw, technology, sps, aggregation, transmission_type`,
          [clientIdNum, name, state, capacity, technology, false, false, transmissionType],
        );

        createdIds.push(inserted.rows[0].id);
      }
    }

    return res.status(200).json({
      importedCount: createdIds.length,
      skippedCount: skipped.length,
      totalRows,
      createdIds,
      skipped: skipped.slice(0, 50),
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || 'Failed to import PSS from Excel. Please check the server logs.' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { clientId } = req.query;
    const hasClient = clientId != null;
    const idNum = hasClient ? Number(clientId) : null;

    if (hasClient && (!idNum || Number.isNaN(idNum))) {
      return res.status(400).json({ error: 'clientId must be a number' });
    }

    const where = hasClient ? 'WHERE client_id = $1' : '';
    const params = hasClient ? [idNum] : [];

    const result = await query<ClientPssRow>(
      `SELECT id, client_id, name, state, capacity_mw, technology, sps, aggregation, transmission_type
         FROM client_pss ${where}
        ORDER BY id`,
      params,
    );

    return res.status(200).json({ pss: result.rows.map(mapPss) });
  }

  if (req.method === 'POST') {
    const modeParam = Array.isArray(req.query.mode) ? req.query.mode[0] : req.query.mode;
    if (modeParam === 'importFromExcel') {
      return importPssFromExcel(req, res);
    }

    const { clientId, name, state, capacityMw, technology, sps, aggregation, transmissionType } =
      req.body || {};
    const idNum = Number(clientId);

    if (!idNum || Number.isNaN(idNum) || !name) {
      return res.status(400).json({ error: 'clientId (number) and name are required' });
    }

    if (transmissionType !== 'STU' && transmissionType !== 'CTU') {
      return res.status(400).json({ error: 'transmissionType must be STU or CTU' });
    }

    const capVal =
      capacityMw === undefined || capacityMw === null || capacityMw === ''
        ? null
        : Number(capacityMw);

    try {
      const insert = await query<ClientPssRow>(
        `INSERT INTO client_pss (client_id, name, state, capacity_mw, technology, sps, aggregation, transmission_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, client_id, name, state, capacity_mw, technology, sps, aggregation, transmission_type`,
        [idNum, name, state ?? null, capVal, technology ?? null, !!sps, !!aggregation, transmissionType],
      );

      return res.status(201).json({ pss: mapPss(insert.rows[0]) });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create PSS' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, name, state, capacityMw, technology, sps, aggregation, transmissionType } =
      req.body || {};
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

    if (state !== undefined) {
      updates.push(`state = $${idx++}`);
      params.push(state || null);
    }

    if (capacityMw !== undefined) {
      const capVal =
        capacityMw === null || capacityMw === ''
          ? null
          : Number(capacityMw);

      if (capVal !== null && Number.isNaN(capVal)) {
        return res.status(400).json({ error: 'capacityMw must be a number' });
      }

      updates.push(`capacity_mw = $${idx++}`);
      params.push(capVal);
    }

    if (technology !== undefined) {
      updates.push(`technology = $${idx++}`);
      params.push(technology || null);
    }

    if (typeof sps === 'boolean') {
      updates.push(`sps = $${idx++}`);
      params.push(sps);
    }

    if (typeof aggregation === 'boolean') {
      updates.push(`aggregation = $${idx++}`);
      params.push(aggregation);
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
      const updated = await query<ClientPssRow>(
        `UPDATE client_pss
            SET ${updates.join(', ')}, updated_at = now()
          WHERE id = $${idx}
          RETURNING id, client_id, name, state, capacity_mw, technology, sps, aggregation, transmission_type`,
        params,
      );

      if (!updated.rows[0]) {
        return res.status(404).json({ error: 'PSS not found' });
      }

      return res.status(200).json({ pss: mapPss(updated.rows[0]) });
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
      await query('DELETE FROM client_pss WHERE id = $1', [pssId]);
      return res.status(204).end();
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete PSS' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}

