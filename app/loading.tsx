export default function StoreLoading() {
  return (
    <main className="store-shell" aria-label="Loading AuraFinds">
      <div className="site-header skeleton" />
      <div className="skeleton hero-skeleton" />
      <div className="skeleton skeleton-line title" />
      <div className="product-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="product-skeleton-card" key={index}>
            <div className="skeleton product-skeleton-image" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
    </main>
  );
}
