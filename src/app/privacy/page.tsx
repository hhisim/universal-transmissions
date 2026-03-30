import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import PageBackground from "@/components/scenes/PageBackground";

export const metadata: Metadata = {
  title: "Privacy Policy — Universal Transmissions",
  description:
    "How Universal Transmissions collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageBackground variant="homepage" />
      <Navigation />

      <main
        className="min-h-screen pt-32 pb-20 px-4"
        style={{ background: "var(--ut-black)", zIndex: 1 }}
      >
        <div className="container-ut max-w-3xl mx-auto">
          <SectionReveal>
            <div className="mb-12">
              <p
                className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3"
                style={{ color: "var(--ut-cyan)" }}
              >
                [ Legal ]
              </p>
              <h1
                className="font-display text-4xl md:text-5xl glow-cyan mb-4"
                style={{ color: "var(--ut-white)" }}
              >
                Privacy Policy
              </h1>
              <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                Last updated: March 2026
              </p>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.1}>
            <div
              className="border p-8 md:p-10 space-y-8"
              style={{
                borderColor: "rgba(0,229,255,0.08)",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              {[
                {
                  title: "Information We Collect",
                  content: `When you purchase from Universal Transmissions, we collect your name, email address, shipping address, and payment information through our secure payment processor, Stripe. We do not store your full credit card details on our servers.

When you subscribe to our newsletter, we collect your email address through Brevo (Sendinblue). You may unsubscribe at any time.

When you contact us via the Connect form, we collect your name, email address, and message content.`,
                },
                {
                  title: "How We Use Your Information",
                  content: `We use your information to:
• Process and fulfill your orders (physical and digital products)
• Send order confirmations and delivery updates
• Send occasional newsletter dispatches if you have subscribed
• Respond to your inquiries
• Improve our products and services`,
                },
                {
                  title: "Payment Processing",
                  content: `All payment processing is handled securely by Stripe. Your credit card information is never stored on Universal Transmissions servers. Stripe uses industry-standard encryption and is PCI-DSS compliant.

For physical products, shipping addresses are shared with postal and courier services to enable delivery.`,
                },
                {
                  title: "Newsletter",
                  content: `If you subscribe to "Join the Signal," your email address is stored in Brevo and used to send occasional dispatches. We never sell or share your email with third parties for marketing purposes. You can unsubscribe at any time by contacting us or using the unsubscribe link in any email.`,
                },
                {
                  title: "Data Retention",
                  content: `Order records are retained as required by financial record-keeping laws. Newsletter subscriber data is retained until you unsubscribe. Contact form submissions are kept until the inquiry is resolved.`,
                },
                {
                  title: "Cookies",
                  content: `Universal Transmissions uses minimal cookies necessary for site functionality, including authentication and security. We do not use advertising or tracking cookies.`,
                },
                {
                  title: "Third-Party Services",
                  content: `We use the following third-party services:
• Stripe — payment processing
• PayPal — alternative payment processing
• Brevo — newsletter delivery
• Pinterest — embedded content
• Vercel — hosting and infrastructure

Each of these services has its own privacy policy governing how they handle your data.`,
                },
                {
                  title: "Your Rights",
                  content: `Depending on your location, you may have the right to access, correct, delete, or export your personal data. For GDPR (European Economic Area) users, you have the additional right to restrict processing and to lodge a complaint with your local data protection authority.

To exercise any of these rights, contact us at the address below.`,
                },
                {
                  title: "Data Security",
                  content: `We use HTTPS encryption across all pages. Payment data is handled exclusively by Stripe, which maintains PCI-DSS Level 1 certification. Any personal data stored in our databases is protected by access controls and encryption at rest where available.`,
                },
                {
                  title: "Changes to This Policy",
                  content: `We may update this privacy policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. Significant changes will be communicated via the newsletter if applicable.`,
                },
                {
                  title: "Contact",
                  content: `For any privacy-related questions or to exercise your data rights, contact us via the Connect form at universal-transmissions.com/connect, or email: universaltransmissions@gmail.com`,
                },
              ].map(({ title, content }) => (
                <div key={title}>
                  <h2
                    className="font-heading text-sm tracking-widest uppercase mb-3"
                    style={{ color: "var(--ut-gold)" }}
                  >
                    {title}
                  </h2>
                  <p
                    className="font-body text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    {content}
                  </p>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </main>

      <Footer />
    </>
  );
}
