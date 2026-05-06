import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calculator, Download, Eye, Trash2, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Employee {
  id: string; name: string; position: string; daily_wage: number;
  meal_allowance: number; transport_allowance: number; attendance_bonus: number; overtime_rate: number;
}

interface PayrollRecord {
  id: string; employee_id: string; period_start: string; period_end: string;
  work_days: number; absent_days: number; sick_days: number; leave_days: number;
  total_overtime_hours: number; base_salary: number; meal_total: number;
  overtime_total: number; transport_total: number; attendance_bonus: number;
  deductions: number; total_salary: number; status: string; paid_date: string | null; notes: string;
}

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function PayrollManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Period selection
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const fetchData = async () => {
    setLoading(true);
    const [empRes, payRes] = await Promise.all([
      supabase.from('employees').select('id,name,position,daily_wage,meal_allowance,transport_allowance,attendance_bonus,overtime_rate').eq('status', 'active').order('name'),
      supabase.from('payroll').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setEmployees(empRes.data || []);
    setPayrolls(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generatePayroll = async () => {
    if (!periodStart || !periodEnd) { toast.error('Pilih periode gaji'); return; }
    setGenerating(true);

    // Fetch attendance for period
    const { data: attendanceData } = await supabase.from('attendance')
      .select('*')
      .gte('date', periodStart)
      .lte('date', periodEnd);

    const records = attendanceData || [];
    let created = 0;

    for (const emp of employees) {
      // Check if payroll already exists for this period
      const exists = payrolls.find(p => p.employee_id === emp.id && p.period_start === periodStart && p.period_end === periodEnd);
      if (exists) continue;

      const empAttendance = records.filter(a => a.employee_id === emp.id);
      const hadirRecords = empAttendance.filter(a => a.status === 'hadir');
      const hadir = hadirRecords.length;
      const sakit = empAttendance.filter(a => a.status === 'sakit').length;
      const izin = empAttendance.filter(a => a.status === 'izin').length;
      const alfa = empAttendance.filter(a => a.status === 'alfa').length;
      const totalOT = empAttendance.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);

      // Hitung jumlah minggu kerja unik (berdasarkan tahun-minggu dari tanggal hadir)
      const getWeekKey = (d: string) => {
        const dt = new Date(d);
        const onejan = new Date(dt.getFullYear(), 0, 1);
        const week = Math.ceil((((dt.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
        return `${dt.getFullYear()}-${week}`;
      };
      const weeksWorked = new Set(hadirRecords.map(a => getWeekKey(a.date))).size;
      // Jumlah hari yang ada lembur (dihitung sekali per hari, bukan per jam)
      const overtimeDays = empAttendance.filter(a => (a.overtime_hours || 0) > 0).length;

      const baseSalary = hadir * emp.daily_wage;
      const mealTotal = hadir * emp.meal_allowance;
      const transportTotal = weeksWorked * emp.transport_allowance;
      const overtimeTotal = overtimeDays * emp.overtime_rate;
      // Bonus absen: full jika tidak ada alfa dan tidak ada izin
      const bonusAbsen = (alfa === 0 && izin === 0) ? emp.attendance_bonus : 0;
      const totalSalary = baseSalary + mealTotal + transportTotal + overtimeTotal + bonusAbsen;

      const { error } = await supabase.from('payroll').insert({
        employee_id: emp.id,
        period_start: periodStart,
        period_end: periodEnd,
        work_days: hadir,
        absent_days: alfa,
        sick_days: sakit,
        leave_days: izin,
        total_overtime_hours: totalOT,
        base_salary: baseSalary,
        meal_total: mealTotal,
        overtime_total: overtimeTotal,
        transport_total: transportTotal,
        attendance_bonus: bonusAbsen,
        deductions: 0,
        total_salary: totalSalary,
        status: 'draft',
      });
      if (!error) created++;
    }

    toast.success(`${created} slip gaji berhasil digenerate`);
    fetchData();
    setGenerating(false);
  };

  const markAsPaid = async (id: string) => {
    await supabase.from('payroll').update({ status: 'paid', paid_date: format(new Date(), 'yyyy-MM-dd') }).eq('id', id);
    toast.success('Ditandai sudah dibayar');
    fetchData();
  };

  const deletePayroll = async (id: string) => {
    if (!confirm('Hapus slip gaji ini?')) return;
    await supabase.from('payroll').delete().eq('id', id);
    toast.success('Dihapus');
    fetchData();
  };

  const viewDetail = (p: PayrollRecord) => {
    setSelectedPayroll(p);
    setSelectedEmployee(employees.find(e => e.id === p.employee_id) || null);
    setDetailOpen(true);
  };

  const exportExcel = () => {
    const filtered = getFilteredPayrolls();
    if (filtered.length === 0) { toast.error('Tidak ada data untuk di-export'); return; }

    const rows = filtered.map(p => {
      const emp = employees.find(e => e.id === p.employee_id);
      return {
        'Nama': emp?.name || '-',
        'Posisi': emp?.position || '-',
        'Periode': `${format(new Date(p.period_start), 'dd/MM/yy')} - ${format(new Date(p.period_end), 'dd/MM/yy')}`,
        'Hari Kerja': p.work_days,
        'Alfa': p.absent_days,
        'Sakit': p.sick_days,
        'Izin': p.leave_days,
        'Lembur (jam)': p.total_overtime_hours,
        'Gaji Pokok': p.base_salary,
        'Uang Makan': p.meal_total,
        'Uang Bensin': p.transport_total,
        'Uang Lembur': p.overtime_total,
        'Bonus Absen': p.attendance_bonus,
        'Potongan': p.deductions,
        'Total Gaji': p.total_salary,
        'Status': p.status === 'paid' ? 'Dibayar' : 'Draft',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Gaji');

    // Auto-width columns
    const maxWidths = Object.keys(rows[0]).map(key => Math.max(key.length, ...rows.map(r => String((r as Record<string, unknown>)[key] || '').length)));
    ws['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 25) }));

    XLSX.writeFile(wb, `Rekap_Gaji_${periodStart}_${periodEnd}.xlsx`);
    toast.success('File Excel berhasil di-download');
  };

  const getFilteredPayrolls = () => {
    return payrolls.filter(p => {
      const emp = employees.find(e => e.id === p.employee_id);
      const matchSearch = !search || emp?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  };

  const filteredPayrolls = getFilteredPayrolls();
  const totalGaji = filteredPayrolls.reduce((sum, p) => sum + p.total_salary, 0);

  return (
    <div className="space-y-5">
      {/* Generate payroll */}
      <Card><CardContent className="pt-5 pb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div><Label className="text-xs">Mulai Periode</Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
            <div><Label className="text-xs">Akhir Periode</Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
          </div>
          <Button onClick={generatePayroll} disabled={generating} className="gap-1.5">
            <Calculator className="h-4 w-4" />{generating ? 'Generating...' : 'Generate Gaji'}
          </Button>
        </div>
      </CardContent></Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-muted-foreground mb-1">Total Slip</div>
          <p className="text-2xl font-bold">{filteredPayrolls.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-muted-foreground mb-1">Total Gaji</div>
          <p className="text-lg font-bold text-foreground">{formatRupiah(totalGaji)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-muted-foreground mb-1">Draft</div>
          <p className="text-2xl font-bold text-amber-600">{filteredPayrolls.filter(p => p.status === 'draft').length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-muted-foreground mb-1">Dibayar</div>
          <p className="text-2xl font-bold text-emerald-600">{filteredPayrolls.filter(p => p.status === 'paid').length}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="paid">Dibayar</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportExcel} className="gap-1.5"><Download className="h-4 w-4" />Export Excel</Button>
      </div>

      {/* Payroll table */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Karyawan</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="text-center">Hari Kerja</TableHead>
              <TableHead className="text-right">Total Gaji</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : filteredPayrolls.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada data gaji. Generate gaji terlebih dahulu.</TableCell></TableRow>
            ) : filteredPayrolls.map(p => {
              const emp = employees.find(e => e.id === p.employee_id);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{emp?.name || '-'}</div>
                    <div className="text-xs text-muted-foreground">{emp?.position}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(p.period_start), 'dd MMM', { locale: idLocale })} - {format(new Date(p.period_end), 'dd MMM yy', { locale: idLocale })}
                  </TableCell>
                  <TableCell className="text-center">{p.work_days}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatRupiah(p.total_salary)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'paid' ? 'default' : 'secondary'} className={p.status === 'paid' ? 'bg-emerald-600' : ''}>
                      {p.status === 'paid' ? 'Dibayar' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(p)}><Eye className="h-3.5 w-3.5" /></Button>
                      {p.status === 'draft' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => markAsPaid(p.id)} title="Tandai dibayar">
                          <span className="text-xs font-bold">✓</span>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePayroll(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detail Slip Gaji</DialogTitle></DialogHeader>
          {selectedPayroll && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-semibold">{selectedEmployee?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedEmployee?.position} • {format(new Date(selectedPayroll.period_start), 'dd MMM', { locale: idLocale })} - {format(new Date(selectedPayroll.period_end), 'dd MMM yyyy', { locale: idLocale })}</p>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Kehadiran</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-md bg-emerald-500/10 p-2"><div className="text-lg font-bold text-emerald-600">{selectedPayroll.work_days}</div><div className="text-[10px] text-muted-foreground">Hadir</div></div>
                  <div className="rounded-md bg-red-500/10 p-2"><div className="text-lg font-bold text-red-600">{selectedPayroll.absent_days}</div><div className="text-[10px] text-muted-foreground">Alfa</div></div>
                  <div className="rounded-md bg-amber-500/10 p-2"><div className="text-lg font-bold text-amber-600">{selectedPayroll.sick_days}</div><div className="text-[10px] text-muted-foreground">Sakit</div></div>
                  <div className="rounded-md bg-blue-500/10 p-2"><div className="text-lg font-bold text-blue-600">{selectedPayroll.leave_days}</div><div className="text-[10px] text-muted-foreground">Izin</div></div>
                </div>
              </div>

              <div className="space-y-2 text-sm border-t pt-3">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Rincian Gaji</div>
                <div className="flex justify-between"><span>Gaji Pokok ({selectedPayroll.work_days} hari × {formatRupiah(selectedEmployee?.daily_wage || 0)})</span><span className="font-mono">{formatRupiah(selectedPayroll.base_salary)}</span></div>
                <div className="flex justify-between"><span>Uang Makan ({selectedPayroll.work_days} hari)</span><span className="font-mono">{formatRupiah(selectedPayroll.meal_total)}</span></div>
                <div className="flex justify-between"><span>Uang Bensin ({selectedPayroll.work_days} hari)</span><span className="font-mono">{formatRupiah(selectedPayroll.transport_total)}</span></div>
                <div className="flex justify-between"><span>Uang Lembur ({selectedPayroll.total_overtime_hours} jam)</span><span className="font-mono">{formatRupiah(selectedPayroll.overtime_total)}</span></div>
                <div className="flex justify-between"><span>Bonus Absen</span><span className="font-mono">{formatRupiah(selectedPayroll.attendance_bonus)}</span></div>
                {selectedPayroll.deductions > 0 && (
                  <div className="flex justify-between text-destructive"><span>Potongan</span><span className="font-mono">-{formatRupiah(selectedPayroll.deductions)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Total Gaji</span>
                  <span className="font-mono text-primary">{formatRupiah(selectedPayroll.total_salary)}</span>
                </div>
              </div>

              {selectedPayroll.status === 'draft' && (
                <Button className="w-full" onClick={() => { markAsPaid(selectedPayroll.id); setDetailOpen(false); }}>
                  Tandai Sudah Dibayar
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
