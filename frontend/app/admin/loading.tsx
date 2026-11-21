import LoadingIndicator from "./loading-indicator";

export default function AdminLoading() {
  return <section className="erp-route-loading">
    <LoadingIndicator label="Membuka halaman…" skeleton/>
  </section>;
}
