import { Database } from "lucide-react";

export function HomeEmptyState() {
  return (
    <section className="rounded-lg border border-dashed border-cyan-300 bg-cyan-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-sm">
        <Database aria-hidden="true" className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-slate-950">Welcome to Dativerso</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Upload your first dataset and let Dativerso help you build insights, datasets and dashboards.
      </p>
      <a
        href="/upload"
        className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
      >
        Upload Dataset
      </a>
    </section>
  );
}
