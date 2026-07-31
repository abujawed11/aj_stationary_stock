import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";

export default function ProductSearchSelect({ products, value, onChange, placeholder = "Search product..." }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const selected = products.find((p) => String(p.id) === String(value));
    setQuery(selected ? `${selected.name} (${selected.sku})` : "");
  }, [value, products]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    function updateRect() {
      if (wrapperRef.current) {
        const r = wrapperRef.current.getBoundingClientRect();
        setRect({ top: r.bottom, left: r.left, width: r.width });
      }
    }
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const selectedProduct = products.find((p) => String(p.id) === String(value));
  const isShowingSelectedLabel = selectedProduct && query === `${selectedProduct.name} (${selectedProduct.sku})`;

  const filtered = isShowingSelectedLabel
    ? products
    : products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q)
      );

  function handleSelect(product) {
    onChange(product.id);
    setQuery(`${product.name} (${product.sku})`);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {open &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: rect.top + 4, left: rect.left, width: rect.width }}
            className="z-999 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
          >
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">No products found</p>}
            {filtered.slice(0, 50).map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => handleSelect(p)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span>
                  {p.name} <span className="text-slate-400">({p.sku})</span>
                </span>
                <span className="text-xs text-slate-400">{p.currentStock} {p.unit}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
