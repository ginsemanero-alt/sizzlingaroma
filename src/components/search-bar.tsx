import { Search } from "lucide-react";

export function SearchBar({ defaultValue = "", placeholder = "Search products, barcodes, sales…" }: { defaultValue?: string; placeholder?: string }) {
  return (
    <form action="/search" method="get" role="search" className="relative">
      <label htmlFor="global-search" className="sr-only">Search products and sales</label>
      <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="global-search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-full border-2 border-transparent bg-white py-4 pl-14 pr-28 text-base shadow-soft outline-none transition placeholder:text-muted/70 focus:border-primary sm:text-sm"
        autoComplete="off"
      />
      <button type="submit" className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 rounded-full !py-2">Search</button>
    </form>
  );
}
