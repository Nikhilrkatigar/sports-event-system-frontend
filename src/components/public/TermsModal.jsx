import { X, CheckCircle2 } from 'lucide-react';

export default function TermsModal({ isOpen, termsContent, onAccept, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
            {termsContent}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-4">
          <label className="flex items-center gap-3 flex-1 cursor-pointer">
            <input
              type="checkbox"
              id="terms-checkbox"
              required
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
            <span className="text-gray-700 dark:text-gray-300">
              I agree to the Terms & Conditions
            </span>
          </label>
          <button
            onClick={() => {
              const checkbox = document.getElementById('terms-checkbox');
              if (checkbox?.checked) {
                onAccept();
              } else {
                alert('Please agree to the Terms & Conditions to continue');
              }
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
