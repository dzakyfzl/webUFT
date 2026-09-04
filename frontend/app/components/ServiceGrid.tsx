type Service = {
  title: string;
  description: string;
};

type ServiceGridProps = {
  services: Service[];
};

export function ServiceGrid({ services }: ServiceGridProps) {
  return (
    <div className="grid border-y border-stone-300 sm:grid-cols-2 lg:grid-cols-4">
      {services.map((service, index) => (
        <article key={service.title} className="border-b border-stone-300 px-5 py-7 last:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0 lg:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">0{index + 1}</p>
          <h3 className="mt-5 text-lg font-bold text-slate-950">{service.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{service.description}</p>
        </article>
      ))}
    </div>
  );
}
