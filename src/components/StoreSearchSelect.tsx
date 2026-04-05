import { useState, useMemo, useRef, useEffect } from 'react';
import { Store } from '@/types';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreSearchSelectProps {
  stores: Store[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export default function StoreSearchSelect({ stores, value, onValueChange, placeholder = 'Pilih toko...', showAllOption = false, allOptionLabel = 'Semua Toko' }: StoreSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value === 'all' ? null : stores.find(s => s.id === value);

  const filtered = useMemo(() => {
    if (!search) return stores;
    const q = search.toLowerCase();
    return stores.filter(s => s.name.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q));
  }, [stores, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selected ? `${selected.name} - ${selected.ownerName}` : 'Pilih toko...'}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari toko..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Toko tidak ditemukan</p>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    value === s.id && "bg-accent"
                  )}
                  onClick={() => { onValueChange(s.id); setOpen(false); setSearch(''); }}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === s.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{s.name} - {s.ownerName}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
