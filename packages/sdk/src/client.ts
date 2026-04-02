import type {
  VernacularConfig,
  SendOptions,
  SendResult,
  SendTestOptions,
  Conversation,
  Contact,
  ContactInput,
  InboundMessage,
  InboundCallback,
} from './types.js';

/**
 * Vernacular SDK client.
 *
 * Wraps the Vernacular iMessage CRM API. Uses the global `fetch()` function,
 * which is available in Node.js 18+, Electron, React Native, and all browsers.
 *
 * @example
 * ```ts
 * import { VernacularClient } from '@vernacular/sdk';
 *
 * const client = new VernacularClient({
 *   apiUrl: 'https://vernacular.chat',
 *   apiKey: 'your-api-key',
 *   orgId: 'your-org-id',
 * });
 *
 * await client.send({ to: '+14125551234', message: 'Hello from SDK!' });
 * ```
 */
export class VernacularClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly orgId: string;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: VernacularConfig) {
    // Strip trailing slash from URL
    this.apiUrl = config.apiUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.orgId = config.orgId;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Org-Id': this.orgId,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<T> {
    let url = `${this.apiUrl}${path}`;

    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Vernacular API error ${res.status} ${res.statusText}: ${text}`,
      );
    }

    // Some endpoints may return 204 No Content
    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  /**
   * Send an iMessage to a recipient.
   *
   * @param options - Send options including `to` (phone number) and `message` (body text).
   * @returns The send result including success status and optional messageId.
   */
  async send(options: SendOptions): Promise<SendResult> {
    return this.request<SendResult>('POST', '/api/messages/send', {
      to: options.to,
      message: options.message,
      contactName: options.contactName,
      sourceSystem: options.sourceSystem ?? 'sdk',
    });
  }

  /**
   * Send a test message (useful for verifying station connectivity).
   *
   * @param options - Phone number and optional custom message.
   */
  async sendTest(options: SendTestOptions): Promise<SendResult> {
    return this.request<SendResult>('POST', '/api/send-test', {
      phoneNumber: options.phoneNumber,
      message: options.message,
    });
  }

  // ---------------------------------------------------------------------------
  // Conversations
  // ---------------------------------------------------------------------------

  /**
   * List all conversations.
   *
   * @returns Array of conversation objects.
   */
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('GET', '/api/conversations/list');
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  /**
   * Get contacts, optionally filtered by a search query.
   *
   * @param search - Optional search string to filter contacts by name or phone.
   * @returns Array of contact objects.
   */
  async getContacts(search?: string): Promise<Contact[]> {
    const query = search ? { search } : undefined;
    return this.request<Contact[]>('GET', '/api/contacts', undefined, query);
  }

  /**
   * Create a new contact.
   *
   * @param contact - Contact data including phone and optional display name.
   * @returns The created contact.
   */
  async createContact(contact: ContactInput): Promise<Contact> {
    return this.request<Contact>('POST', '/api/contacts', contact);
  }

  // ---------------------------------------------------------------------------
  // Engine / Station
  // ---------------------------------------------------------------------------

  /**
   * Poll for new inbound messages.
   *
   * @returns Array of inbound messages received since last poll.
   */
  async pollInbound(): Promise<InboundMessage[]> {
    return this.request<InboundMessage[]>('GET', '/api/engine/poll-inbound');
  }

  /**
   * Send a heartbeat ping from a station.
   *
   * @param stationName - The name of the station sending the heartbeat.
   */
  async heartbeat(stationName: string): Promise<void> {
    await this.request<void>('POST', '/api/engine/ping', {
      stationName,
    });
  }

  // ---------------------------------------------------------------------------
  // Inbound listener (polling)
  // ---------------------------------------------------------------------------

  /**
   * Start polling for inbound messages at a regular interval.
   * Calls the provided callback whenever new messages arrive.
   *
   * @param callback - Function called with an array of new inbound messages.
   * @param intervalMs - Polling interval in milliseconds (default: 30000).
   * @returns A stop function that cancels the polling.
   *
   * @example
   * ```ts
   * const stop = client.onInbound((messages) => {
   *   messages.forEach(m => console.log(`${m.from}: ${m.body}`));
   * });
   *
   * // Later, stop polling:
   * stop();
   * ```
   */
  onInbound(callback: InboundCallback, intervalMs = 30_000): () => void {
    // Run immediately, then on interval
    const poll = async () => {
      try {
        const messages = await this.pollInbound();
        if (messages && messages.length > 0) {
          await callback(messages);
        }
      } catch (err) {
        // Silently ignore poll errors to keep the loop alive.
        // Consumers can wrap their callback in try/catch for their own error handling.
        console.error('[Vernacular SDK] Poll error:', err);
      }
    };

    // Fire immediately
    void poll();

    this.pollTimer = setInterval(poll, intervalMs);

    return () => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    };
  }

  /**
   * Stop all active polling. Useful for cleanup.
   */
  destroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
