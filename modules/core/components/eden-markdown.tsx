"use client";

import ReactMarkdown from "react-markdown";

export function EdenMarkdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm text-white/70 leading-7">
      <ReactMarkdown
        components={{
          h1: ({ children: c }) => <h1 className="text-xl font-semibold text-white mt-4 mb-2">{c}</h1>,
          h2: ({ children: c }) => <h2 className="text-lg font-semibold text-white mt-3 mb-2">{c}</h2>,
          h3: ({ children: c }) => <h3 className="text-base font-semibold text-white mt-2 mb-1">{c}</h3>,
          p: ({ children: c }) => <p className="text-white/70 leading-7 mb-2">{c}</p>,
          strong: ({ children: c }) => <strong className="text-white font-semibold">{c}</strong>,
          em: ({ children: c }) => <em className="italic text-white/60">{c}</em>,
          ul: ({ children: c }) => <ul className="list-disc list-inside space-y-1 ml-2">{c}</ul>,
          ol: ({ children: c }) => <ol className="list-decimal list-inside space-y-1 ml-2">{c}</ol>,
          li: ({ children: c }) => <li className="text-white/70">{c}</li>,
          code: ({ children: c, className }) => {
            if (className) {
              return <code className={className}>{c}</code>;
            }
            return <code className="text-[#2dd4bf] bg-white/5 px-1.5 py-0.5 rounded text-xs">{c}</code>;
          },
          pre: ({ children: c }) => <pre className="bg-[rgba(13,30,46,0.8)] border border-white/10 rounded-xl p-4 overflow-x-auto text-xs">{c}</pre>,
          hr: () => <hr className="border-white/10 my-4" />,
          a: ({ href, children: c }) => <a href={href} className="text-[#2dd4bf] hover:underline" target="_blank" rel="noopener noreferrer">{c}</a>,
          blockquote: ({ children: c }) => <blockquote className="border-l-2 border-white/10 pl-4 text-white/50 italic">{c}</blockquote>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
