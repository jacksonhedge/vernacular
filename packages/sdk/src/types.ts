/** Configuration for the Vernacular SDK client. */
export interface VernacularConfig {
  /** Base URL of the Vernacular API (e.g. "https://vernacular.chat") */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Organization ID */
  orgId: string;
}

/** Options for sending an iMessage via the API. */
export interface SendOptions {
  /** Recipient phone number (any format, will be normalized) */
  to: string;
  /** Message body text */
  message: string;
  /** Optional contact display name */
  contactName?: string;
  /** Source system identifier (e.g. "crm", "zapier", "sdk") */
  sourceSystem?: string;
}

/** Result returned after sending a message. */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Options for the send-test endpoint. */
export interface SendTestOptions {
  /** Phone number to send the test message to */
  phoneNumber: string;
  /** Optional custom message (defaults to server-side test message) */
  message?: string;
}

/** A conversation thread between a station and a contact. */
export interface Conversation {
  id: string;
  stationId?: string;
  contactId?: string;
  threadId?: string;
  status?: string;
  lastMessageAt?: string;
  contact?: Contact;
  messages?: Message[];
  [key: string]: unknown;
}

/** A contact in the Vernacular CRM. */
export interface Contact {
  id: string;
  phone: string;
  displayName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Input for creating a new contact. */
export interface ContactInput {
  phone: string;
  displayName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** A single message in a conversation. */
export interface Message {
  id: string;
  conversationId?: string;
  direction: 'inbound' | 'outbound';
  body: string;
  modelUsed?: string;
  imessageGuid?: string;
  sentAt?: string;
  [key: string]: unknown;
}

/** An inbound message received from polling. */
export interface InboundMessage {
  id: string;
  from: string;
  body: string;
  receivedAt: string;
  stationId?: string;
  contactName?: string;
  [key: string]: unknown;
}

/** A Mac station running iMessage. */
export interface Station {
  id: string;
  phoneNumber: string;
  appleId?: string;
  machineName?: string;
  isActive: boolean;
  lastHeartbeat?: string;
  [key: string]: unknown;
}

/** Callback type for inbound message listeners. */
export type InboundCallback = (messages: InboundMessage[]) => void | Promise<void>;
