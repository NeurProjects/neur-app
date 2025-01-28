import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { cn } from '@/lib/utils';

// Types
interface JinaWebReaderResponse {
  content: string;
  url: string;
}

// Components
const WebContent = ({
  content,
  className,
}: {
  content: JinaWebReaderResponse;
  className?: string;
}) => {
  const wordCount = content.content.split(/\s+/).length;
  const charCount = content.content.length;

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border/50 bg-background/50 p-3 shadow-sm transition-colors hover:border-border/80 hover:bg-background/80',
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-foreground/80 hover:text-foreground"
        >
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          {content.url}
        </a>
        <div className="flex items-center gap-4 text-xs text-muted-foreground/90">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Characters:</span>
            <span>{charCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Words:</span>
            <span>{wordCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tools Export
export const jinaTools = {
  readWebPage: {
    displayName: '📖 Read Web Page',
    description:
      'Convert any web page into a clean, readable text format that can be easily understood by AI models.',
    parameters: z.object({
      url: z
        .string()
        .url()
        .describe('The URL of the web page to read and convert to text'),
    }),
    isCollapsible: true,
    requiredEnvVars: ['JINA_API_KEY'],
    execute: async ({ url }: { url: string }) => {
      try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.JINA_API_KEY}`,
            'X-Retain-Images': 'none',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to read web page: ${response.statusText}`);
        }

        const content = await response.text();
        return {
          data: {
            content,
            url,
          },
        };
      } catch (error) {
        throw new Error(
          `Failed to read web page: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = raw as { data: JinaWebReaderResponse };
      return <WebContent content={result.data} />;
    },
  },
};
