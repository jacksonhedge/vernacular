import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Vernacular',
  description: 'Terms of Service for Vernacular, an iMessage-as-a-service platform by Hedge, Inc.',
};

const sectionStyle: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#fff' };
const pStyle: React.CSSProperties = { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 12 };

export default function TermsPage() {
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
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 48 }}>Effective Date: April 9, 2026</p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Vernacular platform, website (vernacular.chat), APIs, and related services (collectively, the &quot;Service&quot;) provided by Hedge, Inc. (&quot;Hedge,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), a company incorporated in Pennsylvania with its principal office in Pittsburgh, PA.
          </p>
          <p style={pStyle}>
            By accessing or using the Service, you agree to be bound by these Terms. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. Description of Service</h2>
          <p style={pStyle}>
            Vernacular is an iMessage-as-a-service platform that enables businesses to send and receive real iMessages through dedicated Mac relay stations, each operating with its own phone number and Apple ID. The Service includes a web-based dashboard, AI-powered message drafting and response capabilities, contact management, an embeddable chat widget, and related tools for VIP management, sales outreach, customer support, and app testing workflows.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. Account Registration</h2>
          <p style={pStyle}>
            You must create an account to use the Service. You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately at jackson@hedgepayments.co if you suspect unauthorized access to your account.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. Acceptable Use</h2>
          <p style={pStyle}>
            Your use of the Service is subject to our <a href="/acceptable-use" style={{ color: '#a8d4f0', textDecoration: 'underline' }}>Acceptable Use Policy</a>, which is incorporated into these Terms by reference. You agree not to use the Service for any unlawful purpose, to send unsolicited bulk messages (spam), to harass or threaten any person, or to violate any applicable law or regulation, including the Telephone Consumer Protection Act (TCPA) and CAN-SPAM Act.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. Apple and iMessage</h2>
          <p style={pStyle}>
            The Service relies on Apple&apos;s iMessage protocol and Messages application. You acknowledge that: (a) Apple is not a party to these Terms and has no obligation to you; (b) Apple may change, restrict, or discontinue iMessage functionality at any time without notice; (c) Hedge is not affiliated with, endorsed by, or sponsored by Apple Inc.; (d) your use of the Service must comply with Apple&apos;s Terms of Service and iMessage usage policies; and (e) we cannot guarantee uninterrupted iMessage delivery, as delivery depends on Apple&apos;s infrastructure and the recipient&apos;s device configuration.
          </p>
          <p style={pStyle}>
            &quot;iMessage,&quot; &quot;Apple,&quot; and related marks are trademarks of Apple Inc. Vernacular is an independent platform and is not an Apple product.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Relay Stations</h2>
          <p style={pStyle}>
            Each Vernacular station consists of a dedicated Mac computer, phone number, and Apple ID managed by Hedge. Stations operate at Hedge&apos;s facilities and remain Hedge&apos;s property. We provide commercially reasonable efforts to maintain station uptime but do not guarantee 100% availability. Station phone numbers are provisioned and assigned by Hedge and may not be transferred or ported to external services without our written consent.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. AI-Powered Features</h2>
          <p style={pStyle}>
            The Service includes AI capabilities that can draft, suggest, and (with your permission) automatically send messages on your behalf. You acknowledge that: (a) AI-generated content may contain errors or inappropriate responses; (b) you are solely responsible for reviewing and approving AI-generated messages before they are sent, or for configuring auto-send settings at your own risk; (c) Hedge is not liable for any damages resulting from AI-generated messages; and (d) AI features use third-party language models (including Anthropic&apos;s Claude) and your message content may be processed by these providers subject to their respective privacy policies.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Billing and Payment</h2>
          <p style={pStyle}>
            The Service operates on a usage-based billing model with monthly minimums and per-action costs, as described on our pricing page. Setup fees are one-time and non-refundable. Monthly minimums are charged at the beginning of each billing cycle. Usage above the monthly minimum is billed in arrears. All fees are in U.S. dollars and are non-refundable except as required by law. We reserve the right to change pricing with 30 days&apos; written notice. Failure to pay may result in suspension or termination of your account.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Your Content</h2>
          <p style={pStyle}>
            You retain ownership of all content you submit through the Service, including messages, contact information, and uploaded materials (&quot;Your Content&quot;). By using the Service, you grant Hedge a limited, non-exclusive license to process, store, and transmit Your Content solely for the purpose of providing the Service. You represent that you have all necessary rights and consents to submit Your Content, including any required consent from message recipients.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Data and Privacy</h2>
          <p style={pStyle}>
            Our collection and use of personal information is governed by our <a href="/privacy" style={{ color: '#a8d4f0', textDecoration: 'underline' }}>Privacy Policy</a>. You are responsible for ensuring that your use of the Service complies with applicable privacy laws, including obtaining any required consents from individuals whose data you process through the Service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Intellectual Property</h2>
          <p style={pStyle}>
            The Service, including its design, code, features, and documentation, is owned by Hedge and protected by copyright, trademark, and other intellectual property laws. These Terms do not grant you any rights to Hedge&apos;s trademarks, branding, or proprietary technology. You may not reverse-engineer, decompile, or attempt to extract the source code of the Service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>11. Confidentiality</h2>
          <p style={pStyle}>
            Each party agrees to keep confidential any non-public information disclosed by the other party in connection with the Service, including business plans, technical data, and pricing terms. This obligation does not apply to information that is publicly available, independently developed, or required to be disclosed by law.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>12. Disclaimer of Warranties</h2>
          <p style={pStyle}>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. HEDGE DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT iMESSAGE DELIVERY WILL SUCCEED FOR EVERY MESSAGE.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>13. Limitation of Liability</h2>
          <p style={pStyle}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, HEDGE&apos;S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNTS PAID BY YOU TO HEDGE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL HEDGE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, REGARDLESS OF WHETHER HEDGE WAS ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>14. Indemnification</h2>
          <p style={pStyle}>
            You agree to indemnify, defend, and hold harmless Hedge, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms or any applicable law; (c) the content of messages you send through the Service; or (d) your violation of any third party&apos;s rights.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>15. Term and Termination</h2>
          <p style={pStyle}>
            These Terms remain in effect while you use the Service. Either party may terminate these Terms with 30 days&apos; written notice. Hedge may suspend or terminate your access immediately if you violate these Terms, the Acceptable Use Policy, or any applicable law. Upon termination, your right to use the Service ceases, and we may delete your data after a 30-day grace period unless you request an export. Sections regarding intellectual property, limitation of liability, indemnification, and governing law survive termination.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>16. Modifications</h2>
          <p style={pStyle}>
            We may update these Terms from time to time. If we make material changes, we will notify you by email or through the Service at least 15 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop using the Service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>17. Governing Law and Disputes</h2>
          <p style={pStyle}>
            These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard to conflict-of-law principles. Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in Allegheny County, Pennsylvania. Both parties consent to personal jurisdiction in those courts.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>18. General Provisions</h2>
          <p style={pStyle}>
            These Terms, together with the Privacy Policy and Acceptable Use Policy, constitute the entire agreement between you and Hedge regarding the Service. If any provision is found to be unenforceable, the remaining provisions remain in full effect. Hedge&apos;s failure to enforce any right or provision does not constitute a waiver. You may not assign or transfer these Terms without our prior written consent. Hedge may assign these Terms in connection with a merger, acquisition, or sale of assets.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>19. Contact</h2>
          <p style={pStyle}>
            For questions about these Terms, contact us at:
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
