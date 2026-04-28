import { X, CheckCircle2 } from 'lucide-react';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';

export default function TermsModal({ isOpen, termsContent, onAccept, onClose }) {
  const { translatedText: translatedTerms, isTranslating } = useAutoTranslate(isOpen ? termsContent : '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] sm:p-4">
      <div
        className="bg-white dark:bg-dark-card sm:rounded-2xl shadow-xl max-w-2xl w-full flex flex-col rounded-t-2xl"
        style={{ maxHeight: 'min(90dvh, 90vh)', height: 'min(90dvh, 90vh)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content - scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-3 sm:p-6">
            {isTranslating ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${85 - i * 8}%` }} />
                ))}
              </div>
            ) : (
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                {translatedTerms}
              </div>
            )}
          </div>
        </div>

        {/* Footer — always visible, never cut off */}
        <div
          className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:p-6 flex flex-col sm:flex-row gap-3 flex-shrink-0 bg-white dark:bg-dark-card rounded-b-2xl"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <label className="flex items-center gap-2 sm:gap-3 flex-1 cursor-pointer">
            <input
              type="checkbox"
              id="terms-checkbox"
              required
              className="w-4 h-4 sm:w-5 sm:h-5 accent-blue-600 rounded cursor-pointer flex-shrink-0"
            />
            <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-snug">
              I agree to the <span className="text-blue-600 dark:text-blue-400 font-semibold">Terms & Conditions</span>
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
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
