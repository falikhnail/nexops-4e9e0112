import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  daily_wage: number;
  wage_sopir: number;
  wage_kenek: number;
  meal_allowance: number;
  transport_allowance: number;
  attendance_bonus: number;
  overtime_rate: number;
  join_date: string;
  status: string;
  phone: string;
}

const emptyForm: Omit<Employee, 'id'> = {
  name: '', position: '', daily_wage: 0, wage_sopir: 0, wage_kenek: 0, meal_allowance: 0,
  transport_allowance: 0, attendance_bonus: 0, overtime_rate: 0,
  join_date: new Date().toISOString().split('T')[0], status: 'active', phone: '',
};

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) { toast.error('Gagal memuat data karyawan'); }
    else setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    if (editingId) {
      const { error } = await supabase.from('employees').update(form).eq('id', editingId);
      if (error) toast.error('Gagal mengupdate');
      else { toast.success('Karyawan diupdate'); setDialogOpen(false); fetchEmployees(); }
    } else {
      const { error } = await supabase.from('employees').insert(form);
      if (error) toast.error('Gagal menambahkan');
      else { toast.success('Karyawan ditambahkan'); setDialogOpen(false); fetchEmployees(); }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus karyawan "${name}"?`)) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) toast.error('Gagal menghapus');
    else { toast.success('Karyawan dihapus'); fetchEmployees(); }
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({ name: emp.name, position: emp.position, daily_wage: emp.daily_wage, meal_allowance: emp.meal_allowance, transport_allowance: emp.transport_allowance, attendance_bonus: emp.attendance_bonus, overtime_rate: emp.overtime_rate, join_date: emp.join_date, status: emp.status, phone: emp.phone });
    setDialogOpen(true);
  };

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm }); setDialogOpen(true); };

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.position.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const updateField = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));
  const updateNumField = (field: string, value: string) => {
    const num = value === '' ? 0 : parseInt(value.replace(/\D/g, ''), 10);
    setForm(prev => ({ ...prev, [field]: num }));
  };

  const activeCount = employees.filter(e => e.status === 'active').length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" />Total Karyawan</div>
          <p className="text-2xl font-bold text-foreground">{employees.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-muted-foreground mb-1">Aktif</div>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-muted-foreground mb-1">Nonaktif</div>
          <p className="text-2xl font-bold text-destructive">{employees.length - activeCount}</p>
        </CardContent></Card>
      </div>

      {/* Filters & Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama/posisi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" />Tambah</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Tambah'} Karyawan</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nama *</Label><Input value={form.name} onChange={e => updateField('name', e.target.value)} /></div>
                <div><Label>Posisi</Label><Input value={form.position} onChange={e => updateField('position', e.target.value)} /></div>
              </div>
              <div><Label>No. Telepon</Label><Input value={form.phone} onChange={e => updateField('phone', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Gaji Harian</Label><Input value={form.daily_wage === 0 ? '' : form.daily_wage.toLocaleString('id-ID')} onChange={e => updateNumField('daily_wage', e.target.value)} placeholder="0" /></div>
                <div><Label>Uang Makan / hari</Label><Input value={form.meal_allowance === 0 ? '' : form.meal_allowance.toLocaleString('id-ID')} onChange={e => updateNumField('meal_allowance', e.target.value)} placeholder="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Uang Bensin / hari</Label><Input value={form.transport_allowance === 0 ? '' : form.transport_allowance.toLocaleString('id-ID')} onChange={e => updateNumField('transport_allowance', e.target.value)} placeholder="0" /></div>
                <div><Label>Lembur / jam</Label><Input value={form.overtime_rate === 0 ? '' : form.overtime_rate.toLocaleString('id-ID')} onChange={e => updateNumField('overtime_rate', e.target.value)} placeholder="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Bonus Absen (full)</Label><Input value={form.attendance_bonus === 0 ? '' : form.attendance_bonus.toLocaleString('id-ID')} onChange={e => updateNumField('attendance_bonus', e.target.value)} placeholder="0" /></div>
                <div><Label>Tanggal Bergabung</Label><Input type="date" value={form.join_date} onChange={e => updateField('join_date', e.target.value)} /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full mt-2">{editingId ? 'Simpan Perubahan' : 'Tambah Karyawan'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead className="text-right">Gaji/hari</TableHead>
                <TableHead className="text-right">Makan</TableHead>
                <TableHead className="text-right">Bensin</TableHead>
                <TableHead className="text-right">Lembur/jam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Memuat...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Tidak ada data karyawan</TableCell></TableRow>
              ) : filtered.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.position || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatRupiah(emp.daily_wage)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatRupiah(emp.meal_allowance)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatRupiah(emp.transport_allowance)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatRupiah(emp.overtime_rate)}</TableCell>
                  <TableCell>
                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                      {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(emp.id, emp.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
