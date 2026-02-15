import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'

interface MessageContentProps {
  content: string
  isUser?: boolean
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all opacity-0 group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function extractText(children: any): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children?.props?.children) return extractText(children.props.children)
  return ''
}

const MessageContent = memo(function MessageContent({ content, isUser }: MessageContentProps) {
  return (
    <div className={`message-content ${isUser ? 'message-user' : 'message-assistant'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Code blocks
          pre({ children }) {
            const code = extractText(children)
            return (
              <div className="relative group my-2 -mx-1">
                <CopyButton code={code} />
                <pre className="bg-[#0d1117] border border-white/[0.06] rounded-lg p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
                  {children}
                </pre>
              </div>
            )
          },
          // Inline code
          code({ className, children, ...props }) {
            const isBlock = className?.startsWith('hljs') || className?.startsWith('language-')
            if (isBlock) {
              return (
                <code className={`${className || ''} !bg-transparent`} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code
                className={`${isUser ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'} px-1.5 py-0.5 rounded text-[13px] font-mono`}
                {...props}
              >
                {children}
              </code>
            )
          },
          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline underline-offset-2 ${isUser ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary-hover'} transition-colors`}
              >
                {children}
              </a>
            )
          },
          // Paragraphs - no extra margin for single paragraphs
          p({ children }) {
            return <p className="mb-1.5 last:mb-0">{children}</p>
          },
          // Lists
          ul({ children }) {
            return <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className={`border-l-2 ${isUser ? 'border-white/30' : 'border-primary/40'} pl-3 my-1.5 italic opacity-80`}>
                {children}
              </blockquote>
            )
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2 -mx-1">
                <table className="min-w-full text-xs border-collapse">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }) {
            return (
              <th className={`px-3 py-1.5 text-left font-semibold border-b ${isUser ? 'border-white/20' : 'border-border'}`}>
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className={`px-3 py-1.5 border-b ${isUser ? 'border-white/10' : 'border-border/50'}`}>
                {children}
              </td>
            )
          },
          // Horizontal rule
          hr() {
            return <hr className={`my-2 ${isUser ? 'border-white/20' : 'border-border'}`} />
          },
          // Bold
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>
          },
          // Headings (render as bold text in chat context)
          h1({ children }) {
            return <p className="font-bold text-base mb-1">{children}</p>
          },
          h2({ children }) {
            return <p className="font-bold text-sm mb-1">{children}</p>
          },
          h3({ children }) {
            return <p className="font-semibold text-sm mb-1">{children}</p>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})

export default MessageContent
