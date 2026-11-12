import type { ReactNode } from "react";

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass-card slide-up">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="t-section">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="t-page">{title}</h1>
      {subtitle && <p className="t-caption mt-1">{subtitle}</p>}
    </div>
  );
}

export const inputCls = "glass-input";
export const btnPrimary = "btn btn-primary";
export const btnGhost = "btn btn-glass";
export const btnDanger = "btn btn-danger";

export function Empty({ text, href, cta }: { text: string; href?: string; cta?: string }) {
  return (
    <div className="empty-products">
      <p>{text}</p>
      {href && <a href={href} className="mt-3 inline-block font-semibold text-brand hover:underline">{cta}</a>}
    </div>
  );
}
