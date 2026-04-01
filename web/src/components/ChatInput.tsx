import { useState, useRef, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { Send, Image, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSend: (
    content: string,
    attachments?: { uri: string; type: string; name: string }[]
  ) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{ uri: string; type: string; name: string }[]>(
    []
  );
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 6 * 24; // 6 rows max
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && attachments.length === 0) || isLoading || disabled) return;

    onSend(trimmedInput, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const uri = event.target?.result as string;
          setAttachments((prev) => [...prev, { uri, type: file.type, name: file.name }]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border-color bg-card p-4">
      {/* Image previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group"
            >
              <img
                src={attachment.uri}
                alt={attachment.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 p-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={clsx(
          'flex items-end gap-2 p-2 rounded-xl border transition-colors',
          isFocused ? 'border-accent bg-background' : 'border-border-color bg-background'
        )}
      >
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-text-secondary hover:text-accent transition-colors"
          disabled={disabled}
        >
          <Image size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-transparent resize-none text-text-primary placeholder:text-text-secondary focus:outline-none max-h-36"
          disabled={disabled}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || isLoading || disabled}
          className={clsx(
            'p-2 rounded-lg transition-all',
            input.trim() || attachments.length > 0
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-background text-text-secondary',
            (isLoading || disabled) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-text-secondary mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
