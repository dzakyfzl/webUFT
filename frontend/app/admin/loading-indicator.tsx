export default function LoadingIndicator({ label, skeleton = false }: { label: string; skeleton?: boolean }) {
  return <div className="erp-loading" role="status">
    <span className="erp-loading-label"><span className="erp-spinner" aria-hidden="true"/>{label}</span>
    {skeleton && <div className="erp-skeleton-group" aria-hidden="true">
      <span className="erp-skeleton"/><span className="erp-skeleton"/>
    </div>}
  </div>;
}
