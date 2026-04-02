import { useState, useMemo } from 'react';
import { Store } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreSearchSelectProps {
  stores: Store[];
  value: string;
  onValueChange: (value: string) => void;
}

export default function StoreSearchSelect({ stores, value, onValueChange }: StoreSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = stores.find(s => s.id === value);

  const filtered = useMemo(() => {
    if (!search) return stores;
    const q = search.toLowerCase();
    return stores.filter(s => s.name.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q));
  }, [stores, search]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selected ? `${selected.name} - ${selected.ownerName}` : 'Pilih toko...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
      </PopoverContent>
    </Popover>
  );
}
