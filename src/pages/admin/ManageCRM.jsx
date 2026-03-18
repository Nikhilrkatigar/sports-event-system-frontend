import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { useAuth } from '../../context/AuthContext';

export default function ManageCRM() {
  const { admin } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const { confirm } = useConfirm();

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await API.get('/messages');
      setMessages(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const postAnnouncement = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    setPosting(true);
    try {
      await API.post('/messages', {
        message: newMessage
      });
      toast.success('Announcement posted!');
      setNewMessage('');
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const deleteMessage = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;

    try {
      await API.delete(`/messages/${id}`);
      toast.success('Announcement deleted');
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const deleteAllMessages = async () => {
    const confirmed = await confirm({
      title: 'Delete All Announcements',
      message: 'This will delete all announcements permanently. This action cannot be undone.',
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;

    try {
      await API.delete('/messages');
      toast.success('All announcements deleted');
      setMessages([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete announcements');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Public Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">Broadcast messages that appear on the public page</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={deleteAllMessages}
            className="btn-danger"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Post New Announcement */}
      <div className="card max-w-4xl mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 Post New Announcement</h2>
        <form onSubmit={postAnnouncement} className="space-y-3">
          <div>
            <textarea
              className="input-field"
              rows="4"
              placeholder="Type your announcement here... (will be visible to everyone on the public page)"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Posted by: <span className="font-semibold">{admin?.name || 'Admin'}</span>
            </p>
          </div>
          <button
            type="submit"
            disabled={posting || !newMessage.trim()}
            className="btn-primary w-full py-3 rounded-xl font-semibold"
          >
            {posting ? (
              <>
                <span className="animate-spin inline-block mr-2">⌛</span>
                Posting...
              </>
            ) : (
              '🚀 Post Announcement'
            )}
          </button>
        </form>
      </div>

      {/* Announcements List */}
      <div className="card max-w-4xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Announcements ({messages.length})</h2>

        {loading && messages.length === 0 ? (
          <div className="py-12 text-center">
            <div className="animate-spin text-3xl mb-4">⏳</div>
            <p className="text-gray-500">Loading announcements...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">📢</div>
            <p className="text-gray-500 text-lg">No announcements yet</p>
            <p className="text-gray-400 text-sm mt-2">Post an announcement above to get started</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-white border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Announcement Content */}
                    <div className="bg-blue-50 rounded-lg p-3 mb-2 border border-blue-100">
                      <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex gap-3">
                        <span>📝 By: <strong>{msg.adminName || msg.adminId?.name || 'Admin'}</strong></span>
                        <span>🕐 {new Date(msg.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteMessage(msg._id)}
                    className="text-xs px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex-shrink-0"
                    title="Delete announcement"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
