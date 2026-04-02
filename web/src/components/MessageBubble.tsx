import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { clsx } from 'clsx';
import { Message } from '../stores/chatStore';
import { Image, FileText, Copy, Check } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className={clsx(
          'absolute top-2 right-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100',
          'bg-background hover:bg-card text-text-secondary'
        )}
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
      </button>
      <pre className="overflow-x-auto p-4 rounded-lg bg-background my-2">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

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
          pre: ({ children }) => {
            const codeElement = children as { props?: { className?: string; children?: string } };
            const code = codeElement?.props?.children || '';
            const className = codeElement?.props?.className;
            return <CodeBlock className={className}>{String(code)}</CodeBlock>;
          },
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
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
          isUser ? 'bg-accent text-white' : 'bg-card text-text-secondary'
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Message content */}
      <div
        className={clsx(
          'flex flex-col max-w-[75%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((attachment, index) => (
              <div
                key={index}
                className={clsx(
                  'flex items-center gap-2 p-2 rounded-lg bg-card',
                  attachment.type.startsWith('image/') ? 'max-w-48' : ''
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

        {/* Bubble */}
        <div
          className={clsx(
            'p-3 rounded-2xl',
            isUser
              ? 'bg-accent text-white rounded-tr-md'
              : 'bg-card text-text-primary rounded-tl-md'
          )}
        >
          {renderedContent}
        </div>

        {/* Time */}
        <span className="text-xs text-text-secondary mt-1">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
