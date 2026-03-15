import React from 'react';

const CommentButton = ({ commentCount = 0, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-transparent text-gray-600 hover:text-blue-500"
    >
      <span className="text-xl">💬</span>
      {commentCount > 0 && <span className="text-sm font-medium">{commentCount}</span>}
    </button>
  );
};

export default CommentButton;
