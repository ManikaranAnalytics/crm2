export interface EmailRecipient {
  name?: string;
  email: string;
}

export interface EmailAttachmentInfo {
  fileName: string;
  contentType: string;
  size: number;
  isInline: boolean;
  dataId?: number;
  contentId?: string;
  /** Index for downloading nested attachments from .eml files. */
  attachmentIndex?: number;
}

export interface ParsedEmailPreview {
  subject: string;
  senderName: string;
  senderEmail: string;
  to: EmailRecipient[];
  cc: EmailRecipient[];
  creationTime: string;
  bodyFormat: 'html' | 'text';
  htmlBody?: string;
  textBody: string;
  attachments: EmailAttachmentInfo[];
}

/** Backward-compatible alias used by existing components. */
export interface ParsedOutlookMsg {
  subject: string;
  senderName: string;
  senderEmail: string;
  body: string;
  creationTime: string;
  to?: EmailRecipient[];
  cc?: EmailRecipient[];
  bodyFormat?: 'html' | 'text';
  htmlBody?: string;
  textBody?: string;
  attachments?: EmailAttachmentInfo[];
}
