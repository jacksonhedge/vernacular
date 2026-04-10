import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Vernacular',
  description: 'Privacy Policy for Vernacular, an iMessage-as-a-service platform by Hedge, Inc.',
};

const sectionStyle: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#fff' };
const pStyle: React.CSSProperties = { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 12 };
const listStyle: React.CSSProperties = { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, paddingLeft: 24, marginBottom: 12 };

export default function PrivacyPage() {
  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: 'linear-gradient(180deg, #0d1f3c 0%, #1a3a5c 30%, #2e6494 55%, #5a9fd4 75%, #a8d4f0 90%, #dceefb 100%)',
      minHeight: '100vh', color: '#fff',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 48px', maxWidth: 1200, margin: '0 auto',
      }}>
        <a href="/" style={{ textDecoration: 'none', color: '#fff' }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Vernacular</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Log In</a>
          <a href="/signup" style={{
            padding: '10px 24px', borderRadius: 24, background: '#378ADD', color: '#fff',
            textDecoration: 'none', fontSize: 14, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(55,138,221,0.4)',
          }}>Get Started</a>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '60px 48px 120px' }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 48 }}>Effective Date: April 9, 2026</p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            This Privacy Policy explains how Hedge, Inc. (&quot;Hedge,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, stores, and shares personal information through the Vernacular platform (vernacular.chat) and related services (the &quot;Service&quot;). Hedge is based in Pittsburgh, Pennsylvania.
          </p>
          <p style={pStyle}>
            By using the Service, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use the Service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. Information We Collect</h2>

          <p style={{ ...pStyle, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Information you provide directly:</p>
          <ul style={listStyle}>
            <li>Account registration data (name, email address, company name, password)</li>
            <li>Billing information (payment method, billing address)</li>
            <li>Contact lists you upload or create (names, phone numbers, email addresses, physical addresses, dates of birth, tags, notes, and other metadata)</li>
            <li>Message content you compose, approve, or send through the Service</li>
            <li>Conversation goals, AI configuration preferences, and workflow settings</li>
            <li>Support requests and communications with us</li>
          </ul>

          <p style={{ ...pStyle, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Information collected automatically:</p>
          <ul style={listStyle}>
            <li>Message delivery metadata (timestamps, delivery status, read receipts where available)</li>
            <li>Station activity data (uptime, message throughput, health metrics)</li>
            <li>Usage analytics (pages visited, features used, session duration)</li>
            <li>Device and browser information (IP address, browser type, operating system)</li>
            <li>Cookies and similar tracking technologies (see Section 7)</li>
          </ul>

          <p style={{ ...pStyle, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Information from third parties:</p>
          <ul style={listStyle}>
            <li>Contact enrichment data from third-party data providers (when you use our enrichment feature)</li>
            <li>Information from integrated services (Notion, CRM tools) that you connect</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. How We Use Your Information</h2>
          <p style={pStyle}>We use the information we collect to:</p>
          <ul style={listStyle}>
            <li>Provide, operate, and maintain the Service, including sending and receiving iMessages on your behalf</li>
            <li>Process AI-generated message drafts and automated responses using third-party language models</li>
            <li>Store and manage your contact database</li>
            <li>Process payments and manage billing</li>
            <li>Analyze usage patterns to improve the Service</li>
            <li>Send you transactional communications (billing confirmations, service updates, security alerts)</li>
            <li>Respond to your support requests</li>
            <li>Enforce our Terms of Service and Acceptable Use Policy</li>
            <li>Comply with legal obligations</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. AI Processing and Third-Party Models</h2>
          <p style={pStyle}>
            The Service uses artificial intelligence to draft and generate message responses. When AI features are active, message content and conversation context are sent to third-party AI providers (currently Anthropic&apos;s Claude) for processing. These providers process data according to their own privacy policies and data processing agreements. We do not use your message content to train AI models. AI providers receive message content only as needed to generate responses and do not retain it beyond the processing session, subject to their published data retention policies.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. How We Share Your Information</h2>
          <p style={pStyle}>We do not sell your personal information. We may share information with:</p>
          <ul style={listStyle}>
            <li><strong>Service providers:</strong> Cloud hosting (Supabase, Vercel), payment processors, AI model providers (Anthropic), analytics tools, and contact enrichment providers -- all bound by data processing agreements</li>
            <li><strong>Message recipients:</strong> When you send messages through the Service, recipients receive your message content and the station&apos;s phone number</li>
            <li><strong>Legal compliance:</strong> When required by law, subpoena, court order, or governmental request</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice to you</li>
            <li><strong>With your consent:</strong> When you explicitly authorize sharing with a third party</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Data Storage and Security</h2>
          <p style={pStyle}>
            Your data is stored on Supabase (hosted on AWS) in the United States. Message content is encrypted in transit (TLS) and at rest. We implement commercially reasonable security measures including access controls, audit logging, and regular security reviews. Relay stations are physically secured at Hedge&apos;s facilities. Despite these measures, no system is completely secure, and we cannot guarantee absolute security.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Data Retention</h2>
          <p style={pStyle}>
            We retain your data for as long as your account is active or as needed to provide the Service. Message content and conversation history are retained until you delete them or close your account. Upon account closure, we will delete your data within 30 days, except where retention is required by law or for legitimate business purposes (such as resolving disputes or enforcing our agreements). You may request data export at any time before account closure.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Cookies and Tracking</h2>
          <p style={pStyle}>
            We use cookies and similar technologies for authentication, remembering preferences, and analytics. We use Vercel Analytics to understand how users interact with the Service. You can control cookies through your browser settings, but disabling cookies may affect the functionality of the Service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Your Rights and Choices</h2>

          <p style={{ ...pStyle, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>All users:</p>
          <ul style={listStyle}>
            <li>Access, update, or correct your account information at any time through the dashboard</li>
            <li>Export your data (contacts, messages, conversation history) in standard formats</li>
            <li>Delete your account and associated data by contacting us</li>
            <li>Opt out of non-essential communications</li>
          </ul>

          <p style={{ ...pStyle, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>California residents (CCPA/CPRA):</p>
          <p style={pStyle}>If you are a California resident, you have additional rights under the California Consumer Privacy Act and California Privacy Rights Act:</p>
          <ul style={listStyle}>
            <li><strong>Right to know:</strong> Request disclosure of the categories and specific pieces of personal information we have collected about you</li>
            <li><strong>Right to delete:</strong> Request deletion of your personal information, subject to certain exceptions</li>
            <li><strong>Right to correct:</strong> Request correction of inaccurate personal information</li>
            <li><strong>Right to opt out of sale/sharing:</strong> We do not sell or share personal information for cross-context behavioral advertising</li>
            <li><strong>Right to non-discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
          </ul>
          <p style={pStyle}>
            To exercise these rights, contact us at <a href="mailto:jackson@hedgepayments.co" style={{ color: '#a8d4f0', textDecoration: 'underline' }}>jackson@hedgepayments.co</a>. We will verify your identity before processing requests and respond within 45 days.
          </p>

          <p style={{ ...pStyle, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Categories of personal information collected (CCPA disclosure):</p>
          <ul style={listStyle}>
            <li>Identifiers (name, email, phone number, IP address)</li>
            <li>Commercial information (billing history, plan details)</li>
            <li>Internet or electronic activity (usage data, analytics)</li>
            <li>Professional or employment information (company name, role)</li>
            <li>Inferences drawn from the above (usage patterns, preferences)</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Message Recipients&apos; Privacy</h2>
          <p style={pStyle}>
            When you send messages through Vernacular, you act as the data controller for the personal information of your message recipients. You are responsible for: (a) having a lawful basis to contact each recipient; (b) honoring opt-out and do-not-contact requests; (c) complying with applicable messaging laws (TCPA, CAN-SPAM, and state-level regulations); and (d) maintaining accurate records of consent. Hedge acts as a data processor with respect to recipient data you provide.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Chat Widget and Website Visitors</h2>
          <p style={pStyle}>
            If you embed the Vernacular chat widget on your website, we collect information from visitors who interact with the widget, including their messages, browser information, and IP address. This data is stored in your Vernacular account and subject to your own privacy policy. You are responsible for disclosing the use of the Vernacular widget in your website&apos;s privacy policy.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>11. Children&apos;s Privacy</h2>
          <p style={pStyle}>
            The Service is not intended for use by individuals under 18 years of age. We do not knowingly collect personal information from children. If we learn that we have collected information from a child under 18, we will delete it promptly. If you believe a child has provided us with personal information, please contact us at jackson@hedgepayments.co.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>12. International Data Transfers</h2>
          <p style={pStyle}>
            The Service is operated from the United States. If you access the Service from outside the United States, your information will be transferred to and processed in the United States. By using the Service, you consent to this transfer. We take steps to ensure that your data receives adequate protection consistent with applicable data protection laws.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>13. Changes to This Policy</h2>
          <p style={pStyle}>
            We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or through the Service at least 15 days before the changes take effect. The &quot;Effective Date&quot; at the top of this page indicates when the policy was last revised.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>14. Contact Us</h2>
          <p style={pStyle}>
            For questions, concerns, or requests related to this Privacy Policy or your personal data, contact us at:
          </p>
          <p style={pStyle}>
            Hedge, Inc.<br />
            Pittsburgh, PA<br />
            <a href="mailto:jackson@hedgepayments.co" style={{ color: '#a8d4f0', textDecoration: 'underline' }}>jackson@hedgepayments.co</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '32px 48px', maxWidth: 1200, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Vernacular by Hedge, Inc.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Privacy</a>
          <a href="/terms" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Terms</a>
          <a href="/acceptable-use" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Acceptable Use</a>
          <a href="mailto:jackson@hedgepayments.co" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
