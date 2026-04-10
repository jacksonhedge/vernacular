import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy | Vernacular',
  description: 'Acceptable Use Policy for Vernacular, an iMessage-as-a-service platform by Hedge, Inc.',
};

const sectionStyle: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#fff' };
const pStyle: React.CSSProperties = { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 12 };
const listStyle: React.CSSProperties = { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, paddingLeft: 24, marginBottom: 12 };

export default function AcceptableUsePage() {
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
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Acceptable Use Policy</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 48 }}>Effective Date: April 9, 2026</p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            This Acceptable Use Policy (&quot;AUP&quot;) governs your use of the Vernacular platform and services provided by Hedge, Inc. (&quot;Hedge,&quot; &quot;we,&quot; &quot;us&quot;). This AUP is incorporated into and forms part of our <a href="/terms" style={{ color: '#a8d4f0', textDecoration: 'underline' }}>Terms of Service</a>. Violations of this AUP may result in suspension or termination of your account.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. General Principles</h2>
          <p style={pStyle}>
            Vernacular is designed to help businesses communicate with their contacts through iMessage in a professional, respectful, and lawful manner. You must use the Service responsibly and in good faith. You are responsible for all messages sent from your account, including those generated or sent by AI on your behalf.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. Prohibited Content</h2>
          <p style={pStyle}>You may not use the Service to send, distribute, or facilitate content that:</p>
          <ul style={listStyle}>
            <li>Is unlawful, fraudulent, deceptive, or misleading</li>
            <li>Constitutes unsolicited bulk messaging (spam) or messages to recipients who have not consented to receive them</li>
            <li>Harasses, threatens, bullies, intimidates, or stalks any person</li>
            <li>Contains hate speech, promotes violence, or discriminates based on race, ethnicity, gender, religion, sexual orientation, disability, or any other protected characteristic</li>
            <li>Contains or promotes sexually explicit material, child sexual abuse material, or exploitation of minors</li>
            <li>Infringes on intellectual property rights, trade secrets, or proprietary rights of any third party</li>
            <li>Contains malware, viruses, phishing links, or other harmful code</li>
            <li>Impersonates another person or entity, or misrepresents your affiliation with any person or entity</li>
            <li>Promotes illegal gambling, unlicensed financial services, or unregistered securities</li>
            <li>Advertises controlled substances, illegal drugs, or unauthorized pharmaceuticals</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. Messaging Conduct</h2>
          <p style={pStyle}>When sending messages through Vernacular, you must:</p>
          <ul style={listStyle}>
            <li><strong>Obtain consent:</strong> Ensure you have a legitimate basis to contact each recipient. For marketing or promotional messages, obtain prior express written consent as required by the TCPA</li>
            <li><strong>Honor opt-outs:</strong> Immediately stop messaging any recipient who requests to be removed from your contact list or asks you to stop messaging them</li>
            <li><strong>Identify yourself:</strong> Clearly identify yourself or your business in messages. Do not impersonate other companies, brands, or individuals</li>
            <li><strong>Respect quiet hours:</strong> Do not send non-urgent messages between 9:00 PM and 8:00 AM in the recipient&apos;s local time zone</li>
            <li><strong>Limit frequency:</strong> Do not send excessive messages to any single recipient. We reserve the right to enforce rate limits if we determine messaging patterns are abusive</li>
            <li><strong>Use accurate information:</strong> Do not provide false or misleading information about products, services, pricing, or promotions</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. AI Usage Guidelines</h2>
          <p style={pStyle}>When using AI features (auto-drafting, auto-sending, AI chat widget):</p>
          <ul style={listStyle}>
            <li><strong>Review AI output:</strong> If you enable AI auto-send, you accept responsibility for all AI-generated messages. We strongly recommend reviewing AI drafts before sending, especially for new conversation types</li>
            <li><strong>Set appropriate goals:</strong> Configure conversation goals and AI personas that align with professional and lawful communication standards</li>
            <li><strong>Do not train for abuse:</strong> Do not configure AI settings, personas, or instructions designed to generate prohibited content</li>
            <li><strong>Disclose AI use when required:</strong> Where applicable laws or regulations require disclosure that messages are AI-generated, you must configure your messaging to include such disclosures</li>
            <li><strong>Monitor AI conversations:</strong> Regularly review AI-handled conversations for accuracy and appropriateness, especially when AI auto-send is enabled</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Platform Integrity</h2>
          <p style={pStyle}>You may not:</p>
          <ul style={listStyle}>
            <li>Attempt to circumvent rate limits, billing controls, or usage restrictions</li>
            <li>Use the Service to probe, scan, or test the vulnerability of any system or network</li>
            <li>Interfere with or disrupt the Service, relay stations, or infrastructure</li>
            <li>Access or attempt to access another user&apos;s account or data</li>
            <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
            <li>Use the Service through automated means (bots, scrapers) except through our official API</li>
            <li>Resell, sublicense, or redistribute access to the Service without written authorization from Hedge</li>
            <li>Attempt to manipulate or bypass Apple&apos;s iMessage systems in ways that violate Apple&apos;s terms of service</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Contact Data Responsibilities</h2>
          <p style={pStyle}>When uploading or managing contact information through the Service:</p>
          <ul style={listStyle}>
            <li>Ensure you have a lawful basis to store and process each contact&apos;s personal information</li>
            <li>Do not upload contact lists obtained through data scraping, data breaches, or other unlawful means</li>
            <li>Keep contact information accurate and up to date</li>
            <li>Promptly delete contacts who request removal of their personal information</li>
            <li>Do not use the Service to build contact databases for the primary purpose of resale</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Industry-Specific Restrictions</h2>
          <p style={pStyle}>
            Certain industries are subject to additional regulations regarding electronic communications. If you operate in a regulated industry (financial services, healthcare, legal, cannabis, gambling), you are responsible for ensuring your use of the Service complies with all applicable industry-specific regulations. Hedge does not provide compliance advice -- consult your legal counsel.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Chat Widget Usage</h2>
          <p style={pStyle}>If you use the embeddable Vernacular chat widget:</p>
          <ul style={listStyle}>
            <li>Disclose the use of AI and automated responses in your website&apos;s terms or a visible notice near the widget</li>
            <li>Do not embed the widget on websites that contain prohibited content</li>
            <li>Ensure your website&apos;s privacy policy covers data collection through the widget</li>
            <li>Do not use the widget to collect personal information from minors</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Reporting Violations</h2>
          <p style={pStyle}>
            If you become aware of any use of the Service that violates this AUP, please report it to us immediately at <a href="mailto:jackson@hedgepayments.co" style={{ color: '#a8d4f0', textDecoration: 'underline' }}>jackson@hedgepayments.co</a>. We investigate all reports and take appropriate action, which may include warning the user, suspending their account, or reporting the activity to law enforcement.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Enforcement</h2>
          <p style={pStyle}>
            Hedge reserves the right to investigate suspected violations of this AUP and to take any action we deem appropriate, including:
          </p>
          <ul style={listStyle}>
            <li>Issuing a warning</li>
            <li>Temporarily suspending your account or specific features</li>
            <li>Permanently terminating your account</li>
            <li>Removing or disabling access to content that violates this AUP</li>
            <li>Reporting violations to law enforcement or regulatory authorities</li>
          </ul>
          <p style={pStyle}>
            We may take these actions with or without prior notice, depending on the severity of the violation. Serious violations (illegal content, threats of violence, exploitation of minors) will result in immediate termination without warning.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>11. Changes to This Policy</h2>
          <p style={pStyle}>
            We may update this AUP from time to time. Material changes will be communicated through the Service or via email at least 15 days before taking effect. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>12. Contact</h2>
          <p style={pStyle}>
            For questions about this Acceptable Use Policy, contact us at:
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
