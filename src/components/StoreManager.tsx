import { useState, useEffect } from 'react';
import { Store } from '@/types';
import { getStores, addStore, updateStore, deleteStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Phone, MapPin, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StoreManager({ onUpdate }: { onUpdate: () => void }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState({ name: '', ownerName: '', whatsappNumber: '', address: '' });
  const { toast } = useToast();

  const refresh = async () => {
    setStores(await getStores());
    onUpdate();
  };

  useEffect(() => { refresh(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', ownerName: '', whatsappNumber: '', address: '' });
    setOpen(true);
  };

  const openEdit = (store: Store) => {
    setEditing(store);
    setForm({ name: store.name, ownerName: store.ownerName, whatsappNumber: store.whatsappNumber, address: store.address });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.ownerName.trim() || !form.whatsappNumber.trim()) {
      toast({ title: 'Error', description: 'Nama toko, pemilik, dan nomor WA wajib diisi', variant: 'destructive' });
      return;
    }
    if (editing) {
      await updateStore(editing.id, form);
      toast({ title: 'Berhasil', description: 'Data toko diperbarui' });
    } else {
      await addStore(form);
      toast({ title: 'Berhasil', description: 'Toko baru ditambahkan' });
    }
    setOpen(false);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus toko ini?')) {
      await deleteStore(id);
      toast({ title: 'Berhasil', description: 'Toko dihapus' });
      await refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Daftar Toko</h2>
          <p className="text-muted-foreground">Kelola data toko dan kontak</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Toko
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Toko' : 'Tambah Toko Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Nama Toko</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Nama Pemilik</Label><Input value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})} /></div>
            <div><Label>Nomor WhatsApp</Label><Input value={form.whatsappNumber} onChange={e => setForm({...form, whatsappNumber: e.target.value})} /></div>
            <div><Label>Alamat</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <Button onClick={handleSubmit} className="w-full">{editing ? 'Simpan Perubahan' : 'Tambah Toko'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {stores.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Belum ada toko terdaftar</p>
            <Button variant="outline" onClick={openNew} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Tambah Toko Pertama</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{store.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(store)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(store.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" /><span>{store.ownerName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /><span>{store.whatsappNumber}</span>
                </div>
                {store.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /><span>{store.address}</span>
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
