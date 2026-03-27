import { X, CheckCircle2 } from 'lucide-react';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';

export default function TermsModal({ isOpen, termsContent, onAccept, onClose }) {
  const { translatedText: translatedTerms, isTranslating } = useAutoTranslate(isOpen ? termsContent : '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-[60] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-2xl w-full flex flex-col h-[95vh] sm:h-auto sm:max-h-[90vh] my-2 sm:my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content - scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-3 sm:p-6">
            {isTranslating ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" style={{ width: `${85 - i * 8}%` }} />
                ))}
              </div>
            ) : (
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed space-y-3">
                {translatedTerms}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-6 flex flex-col sm:flex-row gap-2 sm:gap-4 flex-shrink-0 bg-white dark:bg-dark-card rounded-b-2xl">
          <label className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 cursor-pointer min-h-[2rem] sm:order-1">
            <input
              type="checkbox"
              id="terms-checkbox"
              required
              className="w-4 h-4 sm:w-5 sm:h-5 accent-blue-600 rounded cursor-pointer flex-shrink-0 mt-0.5 sm:mt-0"
            />
            <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
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
            className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 sm:order-2 whitespace-nowrap text-sm sm:text-base"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
