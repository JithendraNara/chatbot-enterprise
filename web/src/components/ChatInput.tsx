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
    <div className="glass-panel rounded-[1.75rem] p-4 md:p-5">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative group">
              <img
                src={attachment.uri}
                alt={attachment.name}
                className="w-20 h-20 object-cover rounded-2xl border border-white/8"
              />
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 p-1.5 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_8px_20px_rgba(233,69,96,0.35)]"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={clsx(
          'flex items-end gap-3 p-3 md:p-4 rounded-[1.5rem] border transition-all',
          isFocused
            ? 'border-accent bg-white/[0.05] shadow-[0_0_0_1px_rgba(233,69,96,0.18)]'
            : 'border-white/8 bg-white/[0.03]'
        )}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-11 w-11 shrink-0 rounded-2xl bg-white/[0.04] text-text-secondary hover:text-accent hover:bg-white/[0.07] transition-colors flex items-center justify-center"
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
          placeholder="Ask for research, paste a brief, or drop an image for analysis…"
          rows={1}
          className="flex-1 bg-transparent resize-none text-text-primary placeholder:text-text-secondary focus:outline-none max-h-36 leading-6"
          disabled={disabled}
        />

        <button
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || isLoading || disabled}
          className={clsx(
            'h-11 w-11 shrink-0 rounded-2xl transition-all flex items-center justify-center',
            input.trim() || attachments.length > 0
              ? 'bg-accent text-white hover:bg-accent/90 shadow-[0_10px_30px_rgba(233,69,96,0.28)]'
              : 'bg-white/[0.04] text-text-secondary',
            (isLoading || disabled) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 mt-3 text-xs text-text-secondary px-1">
        <p>Enter to send. Shift + Enter for a new line.</p>
        <p className="hidden md:block">Uploads are sent with the thread context.</p>
      </div>
    </div>
  );
}
