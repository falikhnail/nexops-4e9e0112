import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CalendarDays, Save, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

type AttendanceStatus = 'hadir' | 'setengah' | 'izin' | 'sakit' | 'alfa';

interface Employee {
  id: string;
  name: string;
  position: string;
  status: string;
}

interface AttendanceRecord {
  id?: string;
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  overtime_hours: number;
  notes: string;
  role?: string;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  hadir: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  setengah: 'bg-teal-500/10 text-teal-600 border-teal-200',
  izin: 'bg-blue-500/10 text-blue-600 border-blue-200',
  sakit: 'bg-amber-500/10 text-amber-600 border-amber-200',
  alfa: 'bg-red-500/10 text-red-600 border-red-200',
};

export default function AttendanceManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [localEdits, setLocalEdits] = useState<Record<string, { status: AttendanceStatus; overtime_hours: number; notes: string; role: string }>>({});
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    supabase.from('employees').select('id,name,position,status').eq('status', 'active').order('name')
      .then(({ data }) => setEmployees(data || []));
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    const query = viewMode === 'daily'
      ? supabase.from('attendance').select('*').eq('date', selectedDate)
      : supabase.from('attendance').select('*').gte('date', format(monthStart, 'yyyy-MM-dd')).lte('date', format(monthEnd, 'yyyy-MM-dd'));
    const { data } = await query;
    setAttendance((data || []) as AttendanceRecord[]);
    setLocalEdits({});
    setLoading(false);
  };

  useEffect(() => { fetchAttendance(); }, [selectedDate, currentDate, viewMode]);

  const getRecord = (empId: string, date?: string) => {
    const d = date || selectedDate;
    return attendance.find(a => a.employee_id === empId && a.date === d);
  };

  const updateLocal = (empId: string, field: string, value: string | number) => {
    setLocalEdits(prev => ({
      ...prev,
      [empId]: {
        status: prev[empId]?.status || getRecord(empId)?.status || 'hadir',
        overtime_hours: prev[empId]?.overtime_hours ?? getRecord(empId)?.overtime_hours ?? 0,
        notes: prev[empId]?.notes ?? getRecord(empId)?.notes ?? '',
        role: prev[empId]?.role ?? getRecord(empId)?.role ?? 'sopir',
        [field]: value,
      }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const editsToSave = Object.entries(localEdits);
    if (editsToSave.length === 0) { toast.info('Tidak ada perubahan'); setSaving(false); return; }

    for (const [empId, edit] of editsToSave) {
      const existing = getRecord(empId);
      const payload = { employee_id: empId, date: selectedDate, status: edit.status, overtime_hours: edit.overtime_hours, notes: edit.notes, role: edit.role };
      if (existing?.id) {
        await supabase.from('attendance').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('attendance').insert(payload);
      }
    }
    toast.success(`${editsToSave.length} absensi disimpan`);
    fetchAttendance();
    setSaving(false);
  };

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const summary: Record<string, { hadir: number; izin: number; sakit: number; alfa: number; lembur: number }> = {};
    employees.forEach(e => { summary[e.id] = { hadir: 0, izin: 0, sakit: 0, alfa: 0, lembur: 0 }; });
    attendance.forEach(a => {
      if (summary[a.employee_id]) {
        summary[a.employee_id][a.status as AttendanceStatus]++;
        summary[a.employee_id].lembur += a.overtime_hours;
      }
    });
    return summary;
  }, [employees, attendance]);

  // Daily summary stats
  const dailyStats = useMemo(() => {
    const stats = { hadir: 0, izin: 0, sakit: 0, alfa: 0, belum: 0 };
    filtered.forEach(e => {
      const rec = localEdits[e.id] || getRecord(e.id);
      if (!rec) stats.belum++;
      else stats[rec.status as AttendanceStatus]++;
    });
    return stats;
  }, [filtered, attendance, localEdits]);

  return (
    <div className="space-y-5">
      {/* View mode toggle */}
      <div className="flex gap-2">
        <Button variant={viewMode === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('daily')}>Harian</Button>
        <Button variant={viewMode === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('monthly')}>Bulanan</Button>
      </div>

      {viewMode === 'daily' ? (
        <>
          {/* Date picker & stats */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px]" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Hadir: {dailyStats.hadir}</Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Izin: {dailyStats.izin}</Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Sakit: {dailyStats.sakit}</Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600">Alfa: {dailyStats.alfa}</Badge>
              <Badge variant="outline">Belum: {dailyStats.belum}</Badge>
            </div>
            <div className="ml-auto flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-[160px]" />
              </div>
              <Button onClick={handleSaveAll} disabled={saving || Object.keys(localEdits).length === 0} className="gap-1.5">
                <Save className="h-4 w-4" />{saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>

          {/* Daily table */}
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Karyawan</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[110px]">Peran</TableHead>
                  <TableHead className="w-[80px] text-center">Lembur</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Memuat...</TableCell></TableRow>
                ) : filtered.map(emp => {
                  const rec = getRecord(emp.id);
                  const local = localEdits[emp.id];
                  const currentStatus = local?.status || rec?.status || '';
                  const currentOT = local?.overtime_hours ?? rec?.overtime_hours ?? 0;
                  const currentNotes = local?.notes ?? rec?.notes ?? '';
                  const currentRole = local?.role ?? rec?.role ?? 'sopir';
                  const isEdited = !!local;

                  return (
                    <TableRow key={emp.id} className={isEdited ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <div className="font-medium text-sm">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.position}</div>
                      </TableCell>
                      <TableCell>
                        <Select value={currentStatus || 'none'} onValueChange={v => updateLocal(emp.id, 'status', v)}>
                          <SelectTrigger className={`h-8 text-xs ${currentStatus ? STATUS_COLORS[currentStatus as AttendanceStatus] : ''}`}>
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hadir">✅ Hadir</SelectItem>
                            <SelectItem value="izin">📋 Izin</SelectItem>
                            <SelectItem value="sakit">🤒 Sakit</SelectItem>
                            <SelectItem value="alfa">❌ Alfa</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={currentRole} onValueChange={v => updateLocal(emp.id, 'role', v)} disabled={currentStatus !== 'hadir'}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sopir">🚛 Sopir</SelectItem>
                            <SelectItem value="kenek">🧰 Kenek</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={currentOT > 0} onCheckedChange={v => updateLocal(emp.id, 'overtime_hours', v ? 1 : 0)} disabled={currentStatus !== 'hadir'} />
                      </TableCell>
                      <TableCell>
                        <Input value={currentNotes} onChange={e => updateLocal(emp.id, 'notes', e.target.value)} className="h-8 text-xs" placeholder="Catatan..." />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </>
      ) : (
        <>
          {/* Monthly view */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-semibold min-w-[140px] text-center">{format(currentDate, 'MMMM yyyy', { locale: idLocale })}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-[160px]" />
            </div>
          </div>

          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Karyawan</TableHead>
                  <TableHead className="text-center">Hadir</TableHead>
                  <TableHead className="text-center">Izin</TableHead>
                  <TableHead className="text-center">Sakit</TableHead>
                  <TableHead className="text-center">Alfa</TableHead>
                  <TableHead className="text-center">Lembur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Memuat...</TableCell></TableRow>
                ) : filtered.map(emp => {
                  const s = monthlySummary[emp.id] || { hadir: 0, izin: 0, sakit: 0, alfa: 0, lembur: 0 };
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{emp.name}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">{s.hadir}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-blue-500/10 text-blue-600">{s.izin}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-amber-500/10 text-amber-600">{s.sakit}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-red-500/10 text-red-600">{s.alfa}</Badge></TableCell>
                      <TableCell className="text-center font-mono text-xs">{s.lembur}h</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
