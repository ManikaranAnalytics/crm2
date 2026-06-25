import sanitizeHtml from 'sanitize-html';

const EMAIL_ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  'img',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'colgroup',
  'col',
  'span',
  'div',
  'font',
  'center',
  'hr',
  'blockquote',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'sup',
  'sub',
  'u',
  's',
  'strike',
  'style',
  'body',
  'o:p',
];

const EMAIL_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['style', 'class', 'align', 'valign', 'width', 'height', 'cellpadding', 'cellspacing', 'border', 'bgcolor', 'colspan', 'rowspan', 'id'],
  style: ['type'],
  body: ['style', 'class'],
  a: ['href', 'name', 'target', 'rel', 'title'],
  img: ['src', 'alt', 'width', 'height', 'style', 'border'],
  table: ['style', 'width', 'border', 'cellpadding', 'cellspacing', 'bgcolor', 'align'],
  td: ['style', 'width', 'height', 'align', 'valign', 'bgcolor', 'colspan', 'rowspan'],
  th: ['style', 'width', 'height', 'align', 'valign', 'bgcolor', 'colspan', 'rowspan'],
  tr: ['style', 'align', 'valign', 'bgcolor'],
  font: ['color', 'face', 'size', 'style'],
  div: ['style', 'align'],
  p: ['style', 'align'],
  span: ['style'],
};

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: EMAIL_ALLOWED_TAGS,
    allowedAttributes: EMAIL_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    allowVulnerableTags: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToHtml(text: string): string {
  return `<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(text)}</pre>`;
}
