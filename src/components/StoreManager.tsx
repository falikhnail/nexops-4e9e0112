import { useState, useEffect } from 'react';
import { Store } from '@/types';
import { getStores, addStore, updateStore, deleteStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Phone, MapPin, User, Store as StoreIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StoreManager() {
  const [stores, setStores] = useState<Store[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState({ name: '', ownerName: '', whatsappNumber: '', address: '' });
  const { toast } = useToast();

  const refresh = async () => { setStores(await getStores()); };
  useEffect(() => { refresh(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', ownerName: '', whatsappNumber: '', address: '' }); setOpen(true); };
  const openEdit = (store: Store) => { setEditing(store); setForm({ name: store.name, ownerName: store.ownerName, whatsappNumber: store.whatsappNumber, address: store.address }); setOpen(true); };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.ownerName.trim() || !form.whatsappNumber.trim()) {
      toast({ title: 'Error', description: 'Nama toko, pemilik, dan nomor WA wajib diisi', variant: 'destructive' }); return;
    }
    if (editing) { await updateStore(editing.id, form); toast({ title: 'Berhasil', description: 'Data toko diperbarui' }); }
    else { await addStore(form); toast({ title: 'Berhasil', description: 'Toko baru ditambahkan' }); }
    setOpen(false); await refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus toko ini?')) { await deleteStore(id); toast({ title: 'Berhasil', description: 'Toko dihapus' }); await refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Daftar Toko</h2>
          <p className="text-sm text-muted-foreground">Kelola data toko dan kontak</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Toko
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Toko' : 'Tambah Toko Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nama Toko</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Contoh: Toko Maju Jaya" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nama Pemilik</Label>
              <Input value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})} placeholder="Nama pemilik toko" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nomor WhatsApp</Label>
              <Input value={form.whatsappNumber} onChange={e => setForm({...form, whatsappNumber: e.target.value})} placeholder="08xxxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Alamat</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Alamat lengkap" />
            </div>
            <Button onClick={handleSubmit} className="w-full">{editing ? 'Simpan Perubahan' : 'Tambah Toko'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {stores.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <StoreIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Belum ada toko terdaftar</p>
            <p className="text-xs text-muted-foreground mb-4">Mulai dengan menambahkan toko pertama</p>
            <Button variant="outline" onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Tambah Toko</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="border-border/50 hover:border-border transition-colors">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <StoreIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold truncate">{store.name}</span>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(store)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(store.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{store.ownerName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{store.whatsappNumber}</span>
                </div>
                {store.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{store.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
