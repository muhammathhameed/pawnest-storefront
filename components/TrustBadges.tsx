const BADGES = [
  ["🛡️", "30-Day Risk-Free", "100% money-back guarantee"],
  ["⚡", "Fast & Tracked", "Live courier tracking updates"],
  ["🔒", "Secure Checkout", "Encrypted payments via Stripe"],
  ["✨", "Curated Quality", "Rigorously inspected items"],
] as const;

export default function TrustBadges() {
  return (
    <ul className="my-6 grid list-none grid-cols-2 gap-3 border-t border-line p-0 pt-6" aria-label="Our guarantees">
      {BADGES.map(([icon, title, desc]) => (
        <li key={title} className="glass flex items-center gap-3 rounded-[var(--r-md)] p-3">
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <div className="min-w-0">
            <h4 className="t-label !text-[var(--text)]">{title}</h4>
            <p className="t-caption">{desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
