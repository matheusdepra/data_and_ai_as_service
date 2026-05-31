import { Database } from "lucide-react";

export function HomeEmptyState() {
  return (
    <section className="rounded-lg border border-dashed border-[#D0D5DD] bg-[#FAFBFC] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#6E5BFF] shadow-sm">
        <Database aria-hidden="true" className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-[#101828]">Welcome to Dativerso</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">
        Upload your first dataset and let Dativerso help you build insights, datasets and dashboards.
      </p>
      <a
        href="/upload"
        className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-[#6E5BFF] px-4 text-sm font-semibold text-white transition hover:bg-[#5F4CF0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E5BFF]"
      >
        Upload Dataset
      </a>
    </section>
  );
}
