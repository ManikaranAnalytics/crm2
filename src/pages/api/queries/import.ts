import type { NextApiRequest, NextApiResponse } from 'next';

// NOTE: This is a placeholder. Once dependencies are available you can:
// - use `formidable` or similar to parse multipart/form-data
// - use `xlsx` to read the uploaded Excel file
// - call a service that maps Excel rows into Query records

export const config = {
  api: {
    bodyParser: false, // we will handle multipart parsing manually later
  },
};

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  // The detailed implementation depends on file upload middleware, which we cannot
  // install yet due to npm network issues. This stub exists so the frontend can
  // call /api/queries/import and you can later fill in the logic.
  return res.status(501).json({ error: 'Excel import not implemented yet' });
}

