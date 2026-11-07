export default function ProductLoading() {
  return (
    <main className="store-shell">
      <div className="site-header skeleton" />
      <section className="product-detail-grid product-detail-loading" aria-label="Loading product">
        <div className="skeleton product-skeleton-image" />
        <div className="product-skeleton-copy">
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line button" />
        </div>
      </section>
    </main>
  );
}
