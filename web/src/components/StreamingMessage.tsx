import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { clsx } from 'clsx';
import { useChatStore } from '../stores/chatStore';

export default function StreamingMessage() {
  const { streamingText, isTyping } = useChatStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [streamingText]);

  if (!streamingText && !isTyping) return null;

  return (
    <div className="flex gap-3 p-4">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-card text-text-secondary flex items-center justify-center text-sm font-medium shrink-0">
        AI
      </div>

      {/* Bubble */}
      <div className="flex flex-col max-w-[75%]">
        <div
          className={clsx(
            'p-3 rounded-2xl rounded-tl-md bg-card text-text-primary',
            'transition-all duration-150'
          )}
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => (
                  <pre className="overflow-x-auto p-4 rounded-lg bg-background my-2">
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded bg-background text-accent text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {streamingText}
            </ReactMarkdown>
          </div>

          {/* Blinking cursor */}
          <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
