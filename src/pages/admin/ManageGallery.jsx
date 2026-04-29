import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API, { getImageUrl } from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { ImageSkeleton } from '../../components/Skeletons';

export default function ManageGallery() {
  const [gallery, setGallery] = useState([]);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('url');
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await API.get('/gallery');
      setGallery(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!imageUrl && !file) return toast.error('Please provide an image');
    const fd = new FormData();
    fd.append('caption', caption);
    if (mode === 'upload' && file) fd.append('image', file);
    else fd.append('imageUrl', imageUrl);
    
    try {
      const res = await API.post('/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGallery(prev => [res.data, ...prev]);
      toast.success('Image added successfully');
      setCaption(''); setImageUrl(''); setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add image');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: '🗑️ Delete Image',
      message: 'Are you sure you want to delete this image from the gallery?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;
    
    const previousGallery = gallery;
    setGallery(prev => prev.filter(item => item._id !== id));
    
    try {
      await API.delete(`/gallery/${id}`);
      toast.success('Image deleted successfully');
    } catch (err) {
      setGallery(previousGallery);
      toast.error(err.response?.data?.message || 'Failed to delete image');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gallery</h1>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Add Image</h2>
        <div className="flex gap-4 mb-3">
          {['url', 'upload'].map(m => (
            <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value={m} checked={mode === m} onChange={() => setMode(m)} />
              {m === 'url' ? 'Image URL' : 'Upload File'}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {mode === 'url' ? (
            <input className="input-field sm:col-span-2" placeholder="https://example.com/photo.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          ) : (
            <input type="file" accept="image/*" className="input-field sm:col-span-2" onChange={e => setFile(e.target.files[0])} />
          )}
          <input className="input-field" placeholder="Caption (optional)" value={caption} onChange={e => setCaption(e.target.value)} />
        </div>
        <button onClick={handleAdd} className="btn-primary mt-3">Add to Gallery</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <ImageSkeleton height="h-40" width="w-full" />
            <ImageSkeleton height="h-40" width="w-full" />
            <ImageSkeleton height="h-40" width="w-full" />
            <ImageSkeleton height="h-40" width="w-full" />
            <ImageSkeleton height="h-40" width="w-full" />
            <ImageSkeleton height="h-40" width="w-full" />
            <ImageSkeleton height="h-40" width="w-full" />
            <ImageSkeleton height="h-40" width="w-full" />
          </>
        ) : gallery.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No images yet. Add some above!</div>
        ) : (
          gallery.map(item => (
            <div key={item._id} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <img src={getImageUrl(item.image)} alt={item.caption} className="w-full aspect-square object-contain bg-gray-100 dark:bg-gray-800 p-2" />
              {item.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">{item.caption}</div>}
              <button onClick={() => handleDelete(item._id)} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center transform hover:scale-110">✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
