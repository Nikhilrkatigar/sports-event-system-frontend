import { useAutoTranslate } from '../hooks/useAutoTranslate';

/**
 * A component that automatically translates its text content
 * based on the current app language. Use this for dynamic CMS text
 * that appears in lists or repeated elements.
 *
 * @param {{ text: string, as?: string, className?: string, [key: string]: any }} props
 */
export default function TranslatedText({ text, as: Tag = 'span', className, ...rest }) {
  const { translatedText, isTranslating } = useAutoTranslate(text);

  if (!text) return null;

  return (
    <Tag className={className} {...rest}>
      {isTranslating ? (
        <span className="inline-block animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-20" />
      ) : (
        translatedText
      )}
    </Tag>
  );
}
