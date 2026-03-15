import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import LoginRegisterModal from './LoginRegisterModal';

const CommentsSection = ({ eventId, tournamnetId = null }) => {
  const { student, getStudentToken } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [eventId, tournamnetId]);

  const fetchComments = async () => {
    try {
      setFetching(true);
      const endpoint = tournamnetId 
        ? `/tournaments/${tournamnetId}/comments`
        : `/events/${eventId}/comments`;
      const response = await API.get(endpoint);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!student) {
      setShowAuthModal(true);
      return;
    }

    if (!newComment.trim()) {
      alert('Please enter a comment');
      return;
    }

    try {
      setLoading(true);
      const studentToken = getStudentToken();
      const endpoint = tournamnetId 
        ? `/tournaments/${tournamnetId}/comments`
        : `/events/${eventId}/comments`;

      await API.post(
        endpoint,
        {
          comment: newComment.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${studentToken}`
          }
        }
      );

      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      if (error.response?.status === 401) {
        setShowAuthModal(true);
      } else {
        alert(error.response?.data?.message || 'Failed to post comment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Comments</h3>

        {!student ? (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              Please login or register to comment on this event.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Login to Comment
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Posting as: <span className="font-semibold text-gray-800">{student.username}</span>
              </p>
              <textarea
                placeholder="Share your thoughts about this event..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {fetching ? (
            <p className="text-gray-500 text-center py-4">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{comment.username}</p>
                      <p className="text-xs text-gray-400">({comment.uucms})</p>
                    </div>
                    <p className="text-gray-700 mt-1">{comment.comment}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <LoginRegisterModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={fetchComments}
      />
    </>
  );
};

export default CommentsSection;
