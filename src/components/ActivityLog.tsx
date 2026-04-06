import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Search, CalendarDays, History, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  description: string;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  stores: 'Toko',
  piutangs: 'Piutang',
  payments: 'Pembayaran',
  operational_transactions: 'Transaksi Operasional',
  operational_categories: 'Kategori Operasional',
  cash_drawer_deposits: 'Setoran Kas',
};

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof Plus }> = {
  INSERT: { label: 'Tambah', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Plus },
  UPDATE: { label: 'Update', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Pencil },
  DELETE: { label: 'Hapus', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: Trash2 },
};

const PAGE_SIZE = 20;

export default function ActivityLog() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      setLogs((data as ActivityLog[]) || []);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (filterTable !== 'all' && log.table_name !== filterTable) return false;
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!log.description.toLowerCase().includes(q)) return false;
      }
      if (dateFrom || dateTo) {
        const logDate = parseISO(log.created_at);
        const start = dateFrom ? startOfDay(dateFrom) : new Date(0);
        const end = dateTo ? endOfDay(dateTo) : new Date(9999, 11, 31);
        if (!isWithinInterval(logDate, { start, end })) return false;
      }
      return true;
    });
  }, [logs, filterTable, filterAction, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [filterTable, filterAction, search, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch('');
    setFilterTable('all');
    setFilterAction('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = search || filterTable !== 'all' || filterAction !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Log Aktivitas</h2>
          <Badge variant="secondary" className="text-xs">{filtered.length} entri</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari deskripsi aktivitas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger>
                <SelectValue placeholder="Modul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Modul</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                <SelectItem value="INSERT">Tambah</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Hapus</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {dateFrom && dateTo
                    ? `${format(dateFrom, 'dd/MM')} - ${format(dateTo, 'dd/MM')}`
                    : dateFrom
                    ? `Dari ${format(dateFrom, 'dd/MM/yy')}`
                    : dateTo
                    ? `Sampai ${format(dateTo, 'dd/MM/yy')}`
                    : 'Pilih Tanggal'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dari</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={idLocale}
                      initialFocus
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sampai</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={idLocale}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                    Reset Tanggal
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Reset Semua Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Memuat log aktivitas...
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Belum ada aktivitas</p>
              <p className="text-xs mt-1">Semua perubahan data akan tercatat otomatis di sini</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[160px]">Waktu</TableHead>
                  <TableHead className="w-[100px]">Aksi</TableHead>
                  <TableHead className="w-[150px]">Modul</TableHead>
                  <TableHead>Deskripsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(log => {
                  const actionCfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.INSERT;
                  const ActionIcon = actionCfg.icon;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(log.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${actionCfg.color}`}>
                          <ActionIcon className="h-3 w-3" />
                          {actionCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{TABLE_LABELS[log.table_name] || log.table_name}</span>
                      </TableCell>
                      <TableCell className="text-sm">{log.description}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Halaman {page + 1} dari {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
