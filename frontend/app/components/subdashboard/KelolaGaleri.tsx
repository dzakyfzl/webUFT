import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KelolaGaleri() {
  const router = useRouter();

  const [albums, setAlbums] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);

  // Modal State
  const [modalType, setModalType] = useState<'none' | 'add_album' | 'edit_album' | 'add_foto' | 'edit_foto'>('none');
  
  // Form States
  const [albumForm, setAlbumForm] = useState({ id: 0, nama: '', deskripsi: '' });
  const [fotoForm, setFotoForm] = useState({ id: 0, nama: '', pemilik: '', fileID: 0, albumID: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchAlbums = async () => {
    setIsLoading(true);
    let accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken || !refreshtoken) {
      router.push('/admin/login');
      return;
    }
    try {
      const meResponse = await fetch('/api/akun/me', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (meResponse.status === 401) {
        const refreshResponse = await fetch('/api/akun/access-token', {
          headers: { 'Authorization': `Bearer ${refreshtoken}` }
        });
        if (refreshResponse.ok) {
          const newData = await refreshResponse.json();
          localStorage.setItem('access_token', newData.access_token);
          accesstoken = newData.access_token; // Gunakan token baru
        } else {
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }
      }

      const res = await fetch('/api/album/ambil-semua');
      if (res.ok) {
        const data = await res.json();
        setAlbums(data);
      } else {
        throw new Error('Gagal mengambil data album');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbumDetail = async (id: number) => {
    let accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken || !refreshtoken) {
      router.push('/admin/login');
      return;
    }
    try {
      const meResponse = await fetch('/api/akun/me', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (meResponse.status === 401) {
        const refreshResponse = await fetch('/api/akun/access-token', {
          headers: { 'Authorization': `Bearer ${refreshtoken}` }
        });
        if (refreshResponse.ok) {
          const newData = await refreshResponse.json();
          localStorage.setItem('access_token', newData.access_token);
          accesstoken = newData.access_token; // Gunakan token baru
        } else {
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }
      }
      const res = await fetch(`/api/album/ambil/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAlbum(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAuthToken = () => localStorage.getItem('access_token');

  // handlers
  const handleDeleteAlbum = async (id: number) => {
    if (!confirm('Yakin ingin menghapus album ini beserta semua fotonya?')) return;
    let accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken || !refreshtoken) {
      router.push('/admin/login');
      return;
    }
    try {
      const meResponse = await fetch('/api/akun/me', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (meResponse.status === 401) {
        const refreshResponse = await fetch('/api/akun/access-token', {
          headers: { 'Authorization': `Bearer ${refreshtoken}` }
        });
        if (refreshResponse.ok) {
          const newData = await refreshResponse.json();
          localStorage.setItem('access_token', newData.access_token);
          accesstoken = newData.access_token; // Gunakan token baru
        } else {
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }
      }

      const res = await fetch(`/api/album/hapus/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        if (selectedAlbum?.album?.albumID === id) setSelectedAlbum(null);
        fetchAlbums();
      } else alert('Gagal menghapus album');
    } catch (err) {
      alert('Error saat menghapus album');
    }
  };

  const handleSubmitAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = modalType === 'edit_album';
    const url = isEdit ? `/api/album/edit/${albumForm.id}` : '/api/album/tambah';
    const method = isEdit ? 'PUT' : 'POST';

    let accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken || !refreshtoken) {
      router.push('/admin/login');
      return;
    }
    try {
      const meResponse = await fetch('/api/akun/me', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (meResponse.status === 401) {
        const refreshResponse = await fetch('/api/akun/access-token', {
          headers: { 'Authorization': `Bearer ${refreshtoken}` }
        });
        if (refreshResponse.ok) {
          const newData = await refreshResponse.json();
          localStorage.setItem('access_token', newData.access_token);
          accesstoken = newData.access_token; // Gunakan token baru
        } else {
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }
      }
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ nama: albumForm.nama, deskripsi: albumForm.deskripsi })
      });
      if (res.ok) {
        setModalType('none');
        fetchAlbums();
        if (isEdit && selectedAlbum?.album?.albumID === albumForm.id) {
          fetchAlbumDetail(albumForm.id);
        }
      } else alert('Gagal menyimpan album');
    } catch (err) {
      alert('Error saat menyimpan album');
    }
  };

  const handleDeleteFoto = async (id: number, albumId: number) => {
    if (!confirm('Yakin ingin menghapus foto ini?')) return;
    let accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken || !refreshtoken) {
      router.push('/admin/login');
      return;
    }
    try {
      const meResponse = await fetch('/api/akun/me', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (meResponse.status === 401) {
        const refreshResponse = await fetch('/api/akun/access-token', {
          headers: { 'Authorization': `Bearer ${refreshtoken}` }
        });
        if (refreshResponse.ok) {
          const newData = await refreshResponse.json();
          localStorage.setItem('access_token', newData.access_token);
          accesstoken = newData.access_token; // Gunakan token baru
        } else {
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }
      }
      const res = await fetch(`/api/foto/hapus/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        fetchAlbumDetail(albumId);
      } else alert('Gagal menghapus foto');
    } catch (err) {
      alert('Error saat menghapus foto');
    }
  };

  const handleSubmitFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = modalType === 'edit_foto';
    setIsUploading(true);
    let finalFileId = fotoForm.fileID;

    let accesstoken = localStorage.getItem('access_token');
    const refreshtoken = localStorage.getItem('refresh_token');

    if (!accesstoken || !refreshtoken) {
      router.push('/admin/login');
      return;
    }
    try {
      const meResponse = await fetch('/api/akun/me', {
        headers: { 'Authorization': `Bearer ${accesstoken}` }
      });

      if (meResponse.status === 401) {
        const refreshResponse = await fetch('/api/akun/access-token', {
          headers: { 'Authorization': `Bearer ${refreshtoken}` }
        });
        if (refreshResponse.ok) {
          const newData = await refreshResponse.json();
          localStorage.setItem('access_token', newData.access_token);
          accesstoken = newData.access_token; // Gunakan token baru
        } else {
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }
      }
      if (!isEdit && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadRes = await fetch('/api/file/tambah', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: formData
        });
        
        if (!uploadRes.ok) {
          throw new Error('Gagal mengupload file gambar');
        }
        const uploadData = await uploadRes.json();
        finalFileId = uploadData.file_id;
      } else if (!isEdit && !selectedFile) {
        throw new Error('Harap pilih file gambar untuk diupload');
      }

      const url = isEdit ? `/api/foto/edit/${fotoForm.id}` : `/api/foto/tambah/${fotoForm.albumID}`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ 
            nama: fotoForm.nama, 
            pemilik: fotoForm.pemilik, 
            fileID: finalFileId 
        })
      });
      if (res.ok) {
        setModalType('none');
        setSelectedFile(null);
        fetchAlbumDetail(fotoForm.albumID);
      } else {
          throw new Error('Gagal menyimpan data foto');
      }
    } catch (err: any) {
      alert(err.message || 'Error saat menyimpan foto');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full text-white text-xl">
        Memuat Galeri...
      </div>
    );
  }

  return (
    <div className="p-8 text-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Kelola Galeri</h1>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Daftar Album */}
        <div className="col-span-1 bg-[#18181b] border border-white/5 rounded-2xl p-6 h-fit max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold mb-4">Daftar Album</h2>
          <button 
            onClick={() => {
              setAlbumForm({ id: 0, nama: '', deskripsi: '' });
              setModalType('add_album');
            }}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            + Tambah Album
          </button>
          </div>

          <div className="space-y-4">
            {albums.map((album) => (
              <div 
                key={album.albumID} 
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedAlbum?.album?.albumID === album.albumID ? 'border-red-500 bg-white/5' : 'border-white/10 hover:border-white/20'}`}
                onClick={() => fetchAlbumDetail(album.albumID)}
              >
                <div className="font-semibold">{album.nama}</div>
                <div className="text-xs text-slate-400 mt-1 line-clamp-2">{album.deskripsi || 'Tidak ada deskripsi'}</div>
                
                <div className="flex justify-end gap-2 mt-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAlbumForm({ id: album.albumID, nama: album.nama, deskripsi: album.deskripsi || '' });
                      setModalType('edit_album');
                    }}
                    className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAlbum(album.albumID);
                    }}
                    className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
            {albums.length === 0 && <div className="text-slate-500 text-sm">Belum ada album.</div>}
          </div>
        </div>

        {/* Kolom Detail Album & Foto */}
        <div className="col-span-1 md:col-span-2 bg-[#18181b] border border-white/5 rounded-2xl p-6 h-fit min-h-[50vh]">
          {selectedAlbum ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedAlbum.album.nama}</h2>
                  <p className="text-slate-400 mt-1">{selectedAlbum.album.deskripsi}</p>
                </div>
                <button 
                  onClick={() => {
                    setFotoForm({ id: 0, nama: '', pemilik: '', fileID: 0, albumID: selectedAlbum.album.albumID });
                    setSelectedFile(null);
                    setModalType('add_foto');
                  }}
                  className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  + Tambah Foto
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedAlbum.fotos && selectedAlbum.fotos.map((foto: any) => (
                  <div key={foto.fotoID} className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="aspect-square bg-black/50 rounded-lg flex items-center justify-center mb-3 overflow-hidden border border-white/10">
                      <img 
                        src={`/api/file/ambil/${foto.fileID}`} 
                        alt={foto.nama} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement?.classList.add('flex');
                          (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', '<span class="text-slate-600 text-xs text-center px-2">Gagal memuat<br/>gambar</span>');
                        }}
                      />
                    </div>
                    <div className="font-semibold text-sm truncate" title={foto.nama}>{foto.nama}</div>
                    <div className="text-xs text-slate-400 mt-1 truncate" title={foto.pemilik}>Oleh: {foto.pemilik}</div>
                    
                    <div className="flex justify-end gap-2 mt-3">
                      <button 
                        onClick={() => {
                          setFotoForm({ 
                            id: foto.fotoID, 
                            nama: foto.nama, 
                            pemilik: foto.pemilik, 
                            fileID: foto.fileID, 
                            albumID: selectedAlbum.album.albumID 
                          });
                          setModalType('edit_foto');
                        }}
                        className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded w-full"
                      >
                        Edit Atribut
                      </button>
                      <button 
                        onClick={() => handleDeleteFoto(foto.fotoID, selectedAlbum.album.albumID)}
                        className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded w-full"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
                {(!selectedAlbum.fotos || selectedAlbum.fotos.length === 0) && (
                  <div className="col-span-full text-center text-slate-500 py-8">
                    Album ini belum memiliki foto.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Pilih album dari daftar untuk melihat detail dan fotonya.
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {modalType !== 'none' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalType === 'add_album' ? 'Tambah Album Baru' : 
               modalType === 'edit_album' ? 'Edit Album' :
               modalType === 'add_foto' ? 'Tambah Foto ke Album' : 'Edit Atribut Foto'}
            </h3>
            
            {/* Form Album */}
            {(modalType === 'add_album' || modalType === 'edit_album') && (
              <form onSubmit={handleSubmitAlbum} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nama Album</label>
                  <input 
                    required 
                    type="text" 
                    value={albumForm.nama}
                    onChange={(e) => setAlbumForm({...albumForm, nama: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Deskripsi</label>
                  <textarea 
                    value={albumForm.deskripsi}
                    onChange={(e) => setAlbumForm({...albumForm, deskripsi: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white h-24" 
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setModalType('none')} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Batal</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors">Simpan</button>
                </div>
              </form>
            )}

            {/* Form Foto */}
            {(modalType === 'add_foto' || modalType === 'edit_foto') && (
              <form onSubmit={handleSubmitFoto} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nama/Judul Foto</label>
                  <input 
                    required 
                    type="text" 
                    value={fotoForm.nama}
                    onChange={(e) => setFotoForm({...fotoForm, nama: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Pemilik/Kreator</label>
                  <input 
                    required 
                    type="text" 
                    value={fotoForm.pemilik}
                    onChange={(e) => setFotoForm({...fotoForm, pemilik: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white" 
                  />
                </div>
                {modalType === 'add_foto' ? (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">File Gambar</label>
                    <input 
                      required 
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" 
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">File ID (Hanya Baca)</label>
                    <input 
                      readOnly
                      type="number"
                      value={fotoForm.fileID || ''}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-slate-500 opacity-50 cursor-not-allowed" 
                    />
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" disabled={isUploading} onClick={() => setModalType('none')} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Batal</button>
                  <button type="submit" disabled={isUploading} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50">
                    {isUploading ? 'Menyimpan...' : (modalType === 'add_foto' ? 'Upload & Simpan' : 'Simpan Atribut')}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
