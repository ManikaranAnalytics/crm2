import iconvLite from 'iconv-lite';
import { promisify } from 'util';
import { decompressRTF } from '@kenjiuno/decompressrtf';
import { deEncapsulateSync } from 'rtf-stream-parser';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rtfToHtmlPkg = require('@iarna/rtf-to-html');

const rtfStringToHtml = promisify(rtfToHtmlPkg.fromString) as (rtf: string) => Promise<string>;

const RTF_DECAPSULATE_OPTIONS = {
  decode: iconvLite.decode,
  outlookQuirksMode: true,
  htmlPreserveSpaces: true,
  htmlFixContentType: true,
};

function rtfResultToString(text: string | Buffer): string {
  return typeof text === 'string' ? text : text.toString('utf8');
}

function looksLikeHtml(text: string): boolean {
  return /<(html|body|table|thead|tbody|tr|td|th|div|p|span|img|meta)\b/i.test(text);
}

function extractBodyFromHtmlDocument(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function deencapsulateOutlookRtf(rtfBuffer: Buffer): string | undefined {
  for (const mode of ['html', 'either'] as const) {
    try {
      const result = deEncapsulateSync(rtfBuffer, { ...RTF_DECAPSULATE_OPTIONS, mode });
      const text = rtfResultToString(result.text);
      if (result.mode === 'html' || looksLikeHtml(text)) {
        return extractBodyFromHtmlDocument(text);
      }
    } catch {
      // Try next mode.
    }
  }
  return undefined;
}

export function msgCompressedRtfToHtmlSync(compressedRtf: Uint8Array): string | undefined {
  try {
    const decompressed = decompressRTF(Array.from(compressedRtf));
    return deencapsulateOutlookRtf(Buffer.from(decompressed));
  } catch {
    return undefined;
  }
}

export async function msgCompressedRtfToHtml(compressedRtf: Uint8Array): Promise<string | undefined> {
  const encapsulated = msgCompressedRtfToHtmlSync(compressedRtf);
  if (encapsulated?.trim()) return encapsulated;

  // Last resort: generic RTF renderer (tables may flatten — prefer de-encapsulation above).
  try {
    const decompressed = decompressRTF(Array.from(compressedRtf));
    const rtfText = iconvLite.decode(Buffer.from(decompressed), 'latin1');
    const fullHtml = await rtfStringToHtml(rtfText);
    return extractBodyFromHtmlDocument(fullHtml);
  } catch {
    return undefined;
  }
}

export function decodeMsgHtmlBytes(html: Uint8Array, codepage?: number): string {
  const buf = Buffer.from(html);
  const utf8 = buf.toString('utf8');
  if (utf8 && !utf8.includes('\ufffd') && /<[a-z!/]/i.test(utf8)) {
    return utf8;
  }
  const encoding = codepage ? `cp${codepage}` : 'windows-1252';
  try {
    return iconvLite.decode(buf, encoding);
  } catch {
    return iconvLite.decode(buf, 'windows-1252');
  }
}
