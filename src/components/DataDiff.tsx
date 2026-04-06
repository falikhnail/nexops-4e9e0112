import { Badge } from '@/components/ui/badge';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nama',
  owner_name: 'Pemilik',
  whatsapp_number: 'No. WhatsApp',
  address: 'Alamat',
  invoice_number: 'No. Invoice',
  amount: 'Nominal',
  remaining_amount: 'Sisa',
  due_date: 'Jatuh Tempo',
  status: 'Status',
  description: 'Keterangan',
  category: 'Kategori',
  type: 'Tipe',
  date: 'Tanggal',
  notes: 'Catatan',
  receipt_url: 'Bukti',
  is_preset: 'Preset',
  piutang_id: 'ID Piutang',
  store_id: 'ID Toko',
  category_id: 'ID Kategori',
};

const HIDDEN_FIELDS = ['id', 'created_at'];

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (val >= 1000) return 'Rp ' + val.toLocaleString('id-ID');
    return String(val);
  }
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  return String(val);
}

interface DataDiffProps {
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
}

export default function DataDiff({ oldData, newData }: DataDiffProps) {
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]))
    .filter(k => !HIDDEN_FIELDS.includes(k));

  const changed = allKeys.filter(k => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]));
  const unchanged = allKeys.filter(k => JSON.stringify(oldData[k]) === JSON.stringify(newData[k]));

  return (
    <div className="space-y-3">
      {changed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Field yang berubah ({changed.length})
          </p>
          <div className="space-y-1.5">
            {changed.map(key => (
              <div key={key} className="flex items-start gap-2 text-xs rounded-md bg-background border border-border p-2">
                <span className="font-medium text-foreground min-w-[120px] shrink-0">
                  {FIELD_LABELS[key] || key}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive line-through">
                  {formatValue(oldData[key])}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatValue(newData[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {unchanged.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Field tidak berubah ({unchanged.length})
          </summary>
          <div className="mt-2 space-y-1">
            {unchanged.map(key => (
              <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                <span className="min-w-[120px] shrink-0">{FIELD_LABELS[key] || key}</span>
                <span>{formatValue(newData[key])}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
