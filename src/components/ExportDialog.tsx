import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Download, CalendarIcon, FileSpreadsheet, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Piutang, Store } from '@/types';
import { getStores, refreshPiutangStatuses } from '@/lib/store';
import { getOperationalTransactions, type OperationalTransaction } from '@/lib/operasional';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportType = 'piutang' | 'operasional' | 'all';
type ExportFormat = 'xlsx' | 'csv' | 'pdf';
type PresetKey = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'custom';

const PRESETS: { value: PresetKey; label: string }[] = [
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'last_month', label: 'Bulan Lalu' },
  { value: 'last_3_months', label: '3 Bulan Terakhir' },
  { value: 'last_6_months', label: '6 Bulan Terakhir' },
  { value: 'custom', label: 'Custom' },
];

function getPresetDates(preset: PresetKey): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': { const m = subMonths(now, 1); return { from: startOfMonth(m), to: endOfMonth(m) }; }
    case 'last_3_months': return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    case 'last_6_months': return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) };
    default: return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const statusLabel = (s: string) => s === 'lunas' ? 'Lunas' : s === 'jatuh_tempo' ? 'Jatuh Tempo' : 'Belum Lunas';

export default function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('piutang');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [preset, setPreset] = useState<PresetKey>('this_month');
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePresetChange = (val: PresetKey) => {
    setPreset(val);
    if (val !== 'custom') {
      const { from, to } = getPresetDates(val);
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const filterByDate = <T extends { date?: string; createdAt?: string }>(items: T[], dateField: 'date' | 'createdAt') => {
    return items.filter(item => {
      const d = parseISO((item as any)[dateField]);
      return isWithinInterval(d, { start: dateFrom, end: dateTo });
    });
  };

  const buildPiutangData = (piutangs: Piutang[], storeMap: Map<string, Store>) => {
    const filtered = filterByDate(piutangs, 'createdAt');
    return filtered.map(p => ({
      'No. Invoice': p.invoiceNumber,
      'Toko': storeMap.get(p.storeId)?.name || '-',
      'Pemilik': storeMap.get(p.storeId)?.ownerName || '-',
      'Total Piutang': p.amount,
      'Sisa Piutang': p.remainingAmount,
      'Terbayar': p.amount - p.remainingAmount,
      'Jatuh Tempo': format(parseISO(p.dueDate), 'd MMM yyyy', { locale: idLocale }),
      'Status': statusLabel(p.status),
      'Tanggal Dibuat': format(parseISO(p.createdAt), 'd MMM yyyy', { locale: idLocale }),
    }));
  };

  const buildOpsData = (txs: OperationalTransaction[]) => {
    const filtered = filterByDate(txs, 'date');
    return filtered.map(t => ({
      'Tanggal': format(parseISO(t.date), 'd MMM yyyy', { locale: idLocale }),
      'Tipe': t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      'Kategori': t.categoryName || t.category,
      'Jumlah': t.amount,
      'Keterangan': t.description || '-',
    }));
  };

  const exportXLSX = (piutangRows: any[], opsRows: any[], filename: string) => {
    const wb = XLSX.utils.book_new();
    if (piutangRows.length > 0 || exportType !== 'operasional') {
      const ws = XLSX.utils.json_to_sheet(piutangRows);
      // Format currency columns
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        for (const col of [3, 4, 5]) { // Total, Sisa, Terbayar
          const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
          if (cell) cell.z = '#,##0';
        }
      }
      ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Piutang');
    }
    if (opsRows.length > 0 || exportType !== 'piutang') {
      const ws2 = XLSX.utils.json_to_sheet(opsRows);
      ws2['!cols'] = [{ wch: 15 }, { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Operasional');
    }
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportCSV = (piutangRows: any[], opsRows: any[], filename: string) => {
    const rows = exportType === 'operasional' ? opsRows : piutangRows;
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = (piutangRows: any[], opsRows: any[], filename: string) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const dateRange = `${format(dateFrom, 'd MMM yyyy', { locale: idLocale })} - ${format(dateTo, 'd MMM yyyy', { locale: idLocale })}`;

    if (exportType !== 'operasional' && piutangRows.length > 0) {
      doc.setFontSize(14);
      doc.text('Laporan Piutang - CV. Manunggal Karya', pageW / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Periode: ${dateRange}`, pageW / 2, 21, { align: 'center' });

      const headers = ['No. Invoice', 'Toko', 'Total Piutang', 'Sisa Piutang', 'Terbayar', 'Jatuh Tempo', 'Status'];
      const body = piutangRows.map(r => [
        r['No. Invoice'], r['Toko'], formatCurrency(r['Total Piutang']),
        formatCurrency(r['Sisa Piutang']), formatCurrency(r['Terbayar']),
        r['Jatuh Tempo'], r['Status'],
      ]);

      autoTable(doc, {
        head: [headers], body, startY: 26,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 110], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      });

      // Summary
      const totalPiutang = piutangRows.reduce((s: number, r: any) => s + r['Total Piutang'], 0);
      const totalSisa = piutangRows.reduce((s: number, r: any) => s + r['Sisa Piutang'], 0);
      const totalBayar = piutangRows.reduce((s: number, r: any) => s + r['Terbayar'], 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 40;
      doc.setFontSize(9);
      doc.text(`Total: ${formatCurrency(totalPiutang)} | Sisa: ${formatCurrency(totalSisa)} | Terbayar: ${formatCurrency(totalBayar)}`, 14, finalY + 8);
    }

    if (exportType !== 'piutang' && opsRows.length > 0) {
      if (exportType === 'all') doc.addPage();
      doc.setFontSize(14);
      doc.text('Laporan Operasional - CV. Manunggal Karya', pageW / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Periode: ${dateRange}`, pageW / 2, 21, { align: 'center' });

      const headers = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Keterangan'];
      const body = opsRows.map(r => [r['Tanggal'], r['Tipe'], r['Kategori'], formatCurrency(r['Jumlah']), r['Keterangan']]);

      autoTable(doc, {
        head: [headers], body, startY: 26,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 110], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 3: { halign: 'right' } },
      });

      const totalIn = opsRows.filter((r: any) => r['Tipe'] === 'Pemasukan').reduce((s: number, r: any) => s + r['Jumlah'], 0);
      const totalOut = opsRows.filter((r: any) => r['Tipe'] === 'Pengeluaran').reduce((s: number, r: any) => s + r['Jumlah'], 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 40;
      doc.setFontSize(9);
      doc.text(`Pemasukan: ${formatCurrency(totalIn)} | Pengeluaran: ${formatCurrency(totalOut)} | Saldo: ${formatCurrency(totalIn - totalOut)}`, 14, finalY + 8);
    }

    doc.save(`${filename}.pdf`);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const [piutangs, stores, opsTxs] = await Promise.all([
        refreshPiutangStatuses(), getStores(), getOperationalTransactions(),
      ]);

      const storeMap = new Map<string, Store>();
      stores.forEach(s => storeMap.set(s.id, s));

      const piutangRows = buildPiutangData(piutangs, storeMap);
      const opsRows = buildOpsData(opsTxs);

      const dateStr = format(dateFrom, 'yyyyMMdd') + '-' + format(dateTo, 'yyyyMMdd');
      const filename = `laporan_${exportType}_${dateStr}`;

      if (exportFormat === 'xlsx') exportXLSX(piutangRows, opsRows, filename);
      else if (exportFormat === 'csv') exportCSV(piutangRows, opsRows, filename);
      else exportPDF(piutangRows, opsRows, filename);

      toast({ title: 'Export berhasil', description: `File ${exportFormat.toUpperCase()} telah diunduh.` });
      setOpen(false);
    } catch (err) {
      toast({ title: 'Gagal export', description: 'Terjadi kesalahan saat export data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Export Laporan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Data Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Data yang diekspor</Label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="piutang">Piutang</SelectItem>
                <SelectItem value="operasional">Operasional</SelectItem>
                <SelectItem value="all">Semua (Piutang + Operasional)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Format File</Label>
            <div className="flex gap-2">
              {([
                { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
                { value: 'csv', label: 'CSV', icon: FileText },
                { value: 'pdf', label: 'PDF', icon: FileText },
              ] as const).map(f => (
                <Button
                  key={f.value}
                  variant={exportFormat === f.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => setExportFormat(f.value)}
                >
                  <f.icon className="h-3.5 w-3.5" />
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Periode</Label>
            <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Dari</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal text-xs')}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {format(dateFrom, 'd MMM yy', { locale: idLocale })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Sampai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal text-xs')}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {format(dateTo, 'd MMM yy', { locale: idLocale })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <Badge variant="secondary" className="text-[10px]">
            {format(dateFrom, 'd MMM yyyy', { locale: idLocale })} — {format(dateTo, 'd MMM yyyy', { locale: idLocale })}
          </Badge>

          <Button onClick={handleExport} disabled={loading} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {loading ? 'Mengunduh...' : `Export ${exportFormat.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
