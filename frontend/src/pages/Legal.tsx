import { Link } from 'react-router-dom';
import { Footer } from '../Layout';

type Doc = { title: string; sections: [string, string][] };

const TERMS: Doc = { title: 'Terms of Service', sections: [
  ['The service', 'LUMIBOOK Digital Library lets registered members access and download authorized e-books according to their membership plan.'],
  ['Accounts', 'You are responsible for your account and password. Give accurate information, keep your login private, and tell us if you suspect misuse. We may suspend accounts that break these terms.'],
  ['Memberships and payments', 'Paid memberships are one-time purchases, not subscriptions. “Lifetime” means for as long as the service operates. Prices are shown in Philippine pesos at checkout. Payments are processed by PayMongo; we never see or store your card details.'],
  ['Limits and fair use', 'Each plan includes a set number of titles and downloads. Plans described as unlimited are subject to fair use and rate limits to prevent abuse and automated bulk downloading.'],
  ['Content and copyright', 'E-books are provided for your personal use only. You may not copy, share, resell, or publish them. If you believe content infringes your rights, contact us at [copyright contact email] and we will review it promptly.'],
  ['Availability and changes', 'We aim for reliable service but do not guarantee uninterrupted access. We may update the catalogue, features, or these terms; material changes will be announced on the site or by email.'],
  ['Liability', 'To the extent permitted by law, the service is provided “as is” and our liability is limited to the amount you paid for your membership.'],
  ['Contact', '[Business name], [address], [contact email].'],
] };

const PRIVACY: Doc = { title: 'Privacy Policy', sections: [
  ['What we collect', 'Your name and email, a securely hashed password, your plan and order history, a payment reference from PayMongo, and a record of your downloads (used to enforce plan limits).'],
  ['What we do not collect', 'We do not store card numbers or e-wallet credentials. Those are handled by PayMongo.'],
  ['Why we use it', 'To run your account, verify your email, process payments, apply plan limits, prevent abuse, send service emails (verification, password reset, receipts), and meet legal obligations.'],
  ['Who we share it with', 'Only service providers that help us run the service: PayMongo (payments), our email provider, and our hosting provider. We do not sell your data.'],
  ['How long we keep it', '[Retention period, e.g. while your account is active, and order records for the period required by law].'],
  ['Your rights', 'Under the Philippine Data Privacy Act of 2012 (RA 10173) you may ask to access, correct, or delete your personal data, and to object to certain processing. Contact [data protection contact email].'],
  ['Security', 'Files are stored privately, downloads use short-lived signed links, passwords are hashed, and access is logged.'],
  ['Changes', 'We will post updates to this policy on this page.'],
] };

const REFUNDS: Doc = { title: 'Refund Policy', sections: [
  ['Digital products', 'Memberships unlock digital content immediately, so refunds are limited.'],
  ['When we refund', '[Owner decision. Suggested: duplicate or accidental charges; a payment taken but the plan not activated; or a request within 7 days if no titles were downloaded.]'],
  ['When we do not', '[Owner decision. Suggested: after you have downloaded titles, or for accounts suspended for breaking the terms.]'],
  ['How to ask', 'Email [support email] with your order number. We reply within [x] business days. Approved refunds go back to the original payment method through PayMongo.'],
] };

function Page({ doc }: { doc: Doc }) {
  return (
    <div className="legal">
      <p><Link to="/login">← Back</Link></p>
      <h1>{doc.title}</h1>
      <p className="banner">Template only. Fill in the [bracketed] items and have a lawyer review this page before launch.</p>
      {doc.sections.map(([h, t]) => <section key={h}><h2>{h}</h2><p>{t}</p></section>)}
      <Footer />
    </div>
  );
}
export const Terms = () => <Page doc={TERMS} />;
export const Privacy = () => <Page doc={PRIVACY} />;
export const Refunds = () => <Page doc={REFUNDS} />;
