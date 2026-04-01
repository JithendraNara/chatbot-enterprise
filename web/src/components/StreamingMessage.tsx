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
    <div className="flex gap-4 py-4">
      <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/8 text-text-secondary flex items-center justify-center text-sm font-medium shrink-0">
        AI
      </div>

      <div className="flex flex-col max-w-[78%]">
        <div className="flex items-center gap-2 mb-2 text-xs text-text-secondary">
          <span className="uppercase tracking-[0.16em]">MiniChat</span>
          <span className="opacity-40">•</span>
          <span>Streaming reply</span>
        </div>
        <div
          className={clsx(
            'p-4 md:p-5 rounded-[1.75rem] rounded-tl-md bg-white/[0.04] border border-white/8 text-text-primary',
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

          <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse rounded-sm" />
        </div>
      </div>
    </div>
  );
}
