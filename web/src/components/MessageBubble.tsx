import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { clsx } from 'clsx';
import { Message } from '../stores/chatStore';
import { Image, FileText } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const renderedContent = useMemo(() => {
    if (!message.content) return null;

    return (
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
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || 'Image'}
              className="max-w-full rounded-lg my-2"
              loading="lazy"
            />
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  }, [message.content]);

  return (
    <div
      className={clsx(
        'flex gap-4 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={clsx(
          'w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-medium shrink-0 border',
          isUser
            ? 'bg-accent/15 text-accent border-accent/20'
            : 'bg-white/[0.04] text-text-secondary border-white/8'
        )}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      <div
        className={clsx(
          'flex flex-col max-w-[78%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div className="flex items-center gap-2 mb-2 text-xs text-text-secondary">
          <span className="uppercase tracking-[0.16em]">{isUser ? 'Operator' : 'MiniChat'}</span>
          <span className="opacity-40">•</span>
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((attachment, index) => (
              <div
                key={index}
                className={clsx(
                  'flex items-center gap-2 p-3 rounded-2xl border bg-white/[0.03]',
                  attachment.type.startsWith('image/') ? 'max-w-52 border-white/8' : 'border-white/6'
                )}
              >
                {attachment.type.startsWith('image/') ? (
                  <Image size={16} className="text-accent shrink-0" />
                ) : (
                  <FileText size={16} className="text-accent shrink-0" />
                )}
                <span className="text-sm truncate">{attachment.name}</span>
              </div>
            ))}
          </div>
        )}

        <div
          className={clsx(
            'p-4 md:p-5 rounded-[1.75rem] border backdrop-blur-xl',
            isUser
              ? 'bg-gradient-to-br from-[#f05b79] to-[#d33d5a] text-white border-transparent shadow-[0_16px_40px_rgba(233,69,96,0.22)] rounded-tr-md'
              : 'bg-white/[0.04] text-text-primary border-white/8 rounded-tl-md'
          )}
        >
          {renderedContent}
        </div>
      </div>
    </div>
  );
}
