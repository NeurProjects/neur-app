'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import {
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  SendHorizontal,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

import { getToolConfig } from '@/ai/providers';
import { FloatingWallet } from '@/components/floating-wallet';
import Logo from '@/components/logo';
import { ToolResult } from '@/components/message/tool-result';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWalletPortfolio } from '@/hooks/use-wallet-portfolio';
import { uploadImage } from '@/lib/upload';
import { cn, throttle } from '@/lib/utils';

// Types
interface UploadingImage extends Attachment {
  localUrl: string;
  uploading: boolean;
}

interface ImagePreview {
  src: string;
  alt: string;
  index?: number;
  attachments?: Required<Attachment>[];
}

interface MessageAttachmentsProps {
  attachments: Attachment[];
  messageId: string;
  onPreviewImage: (preview: ImagePreview) => void;
}

interface ChatMessageProps {
  message: Message;
  index: number;
  messages: Message[];
  onPreviewImage: (preview: ImagePreview) => void;
}

interface AttachmentPreviewProps {
  attachment: UploadingImage;
  onRemove: () => void;
}

interface ImagePreviewDialogProps {
  previewImage: ImagePreview | null;
  onClose: () => void;
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  displayName?: string;
  result?: unknown;
}

// Constants
const MAX_CHARS = 2000;
const MAX_VISIBLE_ATTACHMENTS = 4;
const MAX_JSON_LINES = 20; // Maximum number of lines to show in JSON output

// Utility functions
const truncateJson = (json: unknown): string => {
  const formatted = JSON.stringify(json, null, 2);
  const lines = formatted.split('\n');

  if (lines.length <= MAX_JSON_LINES) {
    return formatted;
  }

  const firstHalf = lines.slice(0, MAX_JSON_LINES / 2);
  const lastHalf = lines.slice(-MAX_JSON_LINES / 2);

  return [...firstHalf, '    ...', ...lastHalf].join('\n');
};

const getGridLayout = (count: number) => {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2 grid-rows-2';
  return 'grid-cols-3 grid-rows-2';
};

const getImageStyle = (index: number, total: number) => {
  if (total === 1) return 'aspect-square max-w-[300px]';
  if (total === 2) return 'aspect-square';
  if (total === 3 && index === 0) return 'col-span-2 aspect-[2/1]';
  return 'aspect-square';
};

const useAnimationEffect = () => {
  useEffect(() => {
    document.body.classList.remove('animate-fade-out');
    document.body.classList.add('animate-fade-in');
    const timer = setTimeout(() => {
      document.body.classList.remove('animate-fade-in');
    }, 300);
    return () => clearTimeout(timer);
  }, []);
};

// Components
function MessageAttachments({
  attachments,
  messageId,
  onPreviewImage,
}: MessageAttachmentsProps) {
  const validAttachments = attachments.filter(
    (attachment): attachment is Required<Attachment> =>
      typeof attachment.contentType === 'string' &&
      typeof attachment.url === 'string' &&
      typeof attachment.name === 'string' &&
      attachment.contentType.startsWith('image/'),
  );

  if (validAttachments.length === 0) return null;

  return (
    <div
      className={cn(
        'grid w-full gap-1.5',
        getGridLayout(validAttachments.length),
      )}
    >
      {validAttachments
        .slice(0, MAX_VISIBLE_ATTACHMENTS)
        .map((attachment, index) => (
          <div
            key={`${messageId}-${index}`}
            className={cn(
              'group relative cursor-zoom-in overflow-hidden',
              getImageStyle(index, validAttachments.length),
              'rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md',
            )}
            onClick={() =>
              onPreviewImage({
                src: attachment.url,
                alt: attachment.name,
                index,
                attachments: validAttachments,
              })
            }
          >
            <Image
              src={attachment.url}
              alt={attachment.name}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {validAttachments.length > MAX_VISIBLE_ATTACHMENTS &&
              index === 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-medium text-white">
                  +{validAttachments.length - MAX_VISIBLE_ATTACHMENTS}
                </div>
              )}
          </div>
        ))}
    </div>
  );
}

function MessageToolInvocations({
  toolInvocations,
}: {
  toolInvocations: ToolInvocation[];
}) {
  return (
    <div className="space-y-px">
      {toolInvocations.map(({ toolCallId, toolName, displayName, result }) => {
        const isCompleted = result !== undefined;
        const isError =
          isCompleted &&
          typeof result === 'object' &&
          result !== null &&
          'error' in result;
        const config = getToolConfig(toolName)!;
        const finalDisplayName = displayName || config.displayName;

        const header = (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full ring-2',
                isCompleted
                  ? isError
                    ? 'bg-destructive ring-destructive/20'
                    : 'bg-emerald-500 ring-emerald-500/20'
                  : 'animate-pulse bg-amber-500 ring-amber-500/20',
              )}
            />
            <span className="truncate text-xs font-medium text-foreground/90">
              {finalDisplayName}
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
              {toolCallId.slice(0, 9)}
            </span>
          </div>
        );

        return (
          <div key={toolCallId} className="group">
            {isCompleted ? (
              <ToolResult
                toolName={toolName}
                result={result}
                expanded={false}
                header={header}
              />
            ) : (
              <>
                {header}
                <div className="mt-px px-3">
                  <div className="h-20 animate-pulse rounded-lg bg-muted/40" />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChatMessage({
  message,
  index,
  messages,
  onPreviewImage,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasAttachments =
    message.experimental_attachments &&
    message.experimental_attachments.length > 0;
  const showAvatar =
    !isUser && (index === 0 || messages[index - 1].role === 'user');
  const isConsecutive = index > 0 && messages[index - 1].role === message.role;

  // Preprocess content to handle image dimensions
  const processedContent = message.content?.replace(
    /!\[(.*?)\]\((.*?)\s+=(\d+)x(\d+)\)/g,
    (_, alt, src, width, height) => `![${alt}](${src}#size=${width}x${height})`,
  );

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isConsecutive ? 'mt-2' : 'mt-6',
        index === 0 && 'mt-0',
      )}
    >
      {showAvatar ? (
        <Avatar className="mt-0.5 h-8 w-8 shrink-0 select-none">
          <Logo />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      ) : !isUser ? (
        <div className="w-8" aria-hidden="true" />
      ) : null}

      <div
        className={cn(
          'relative flex max-w-[85%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {hasAttachments && (
          <div
            className={cn('w-full max-w-[400px]', message.content && 'mb-2')}
          >
            <MessageAttachments
              attachments={message.experimental_attachments!}
              messageId={message.id}
              onPreviewImage={onPreviewImage}
            />
          </div>
        )}

        {message.content && (
          <div
            className={cn(
              'relative flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm',
              isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/60',
            )}
          >
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                  img: ({ node, alt, src, ...props }) => {
                    if (!src) return null;

                    try {
                      // Handle both relative and absolute URLs safely
                      const url = new URL(src, 'http://dummy.com');
                      const size = url.hash.match(/size=(\d+)x(\d+)/);

                      if (size) {
                        const [, width, height] = size;
                        // Remove hash from src
                        url.hash = '';
                        return (
                          <Image
                            src={url.pathname + url.search}
                            alt={alt || ''}
                            width={Number(width)}
                            height={Number(height)}
                            className="inline-block align-middle"
                          />
                        );
                      }
                    } catch (e) {
                      // If URL parsing fails, fallback to original src
                      console.warn('Failed to parse image URL:', e);
                    }

                    const thumbnailPattern = /_thumb\.(png|jpg|jpeg|gif)$/i;
                    const isThumbnail = thumbnailPattern.test(src);

                    const width = isThumbnail ? 40 : 500;
                    const height = isThumbnail ? 40 : 300;

                    // Fallback to Image component with default dimensions
                    return (
                      <Image
                        src={src}
                        alt={alt || ''}
                        width={width}
                        height={height}
                        className="inline-block align-middle"
                      />
                    );
                  },
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {message.toolInvocations && (
          <MessageToolInvocations toolInvocations={message.toolInvocations} />
        )}
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  return (
    <div className="group relative h-16 w-16 shrink-0">
      <Image
        src={attachment.localUrl}
        alt={attachment.name ?? 'Attached image'}
        fill
        className="rounded-lg border object-cover"
      />
      {attachment.uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 shadow-sm backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-background"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function ImagePreviewDialog({
  previewImage,
  onClose,
}: ImagePreviewDialogProps) {
  if (!previewImage) return null;

  const slides = previewImage.attachments
    ? previewImage.attachments.map((attachment) => ({
        src: attachment.url,
        alt: attachment.name,
      }))
    : [{ src: previewImage.src, alt: previewImage.alt }];

  const isSingleImage = slides.length === 1;

  return (
    <Lightbox
      open={!!previewImage}
      close={onClose}
      index={previewImage.index || 0}
      slides={slides}
      controller={{ closeOnBackdropClick: true }}
      styles={{
        container: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
        },
        button: {
          filter: 'none',
          color: 'white',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(4px)',
        },
        navigationPrev: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(4px)',
          borderRadius: '9999px',
          margin: '0 8px',
          display: isSingleImage ? 'none' : undefined,
        },
        navigationNext: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(4px)',
          borderRadius: '9999px',
          margin: '0 8px',
          display: isSingleImage ? 'none' : undefined,
        },
      }}
      animation={{ fade: 300 }}
      carousel={{ finite: false }}
      toolbar={{
        buttons: [
          <button
            key="close"
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 backdrop-blur-xl transition-all duration-200 hover:bg-white/20"
            aria-label="Close preview"
          >
            <X className="h-5 w-5 text-white" />
          </button>,
        ],
      }}
      render={{
        buttonPrev: () => null,
        buttonNext: () => null,
        buttonClose: () => null,
      }}
    />
  );
}

function LoadingMessage() {
  return (
    <div className="flex w-full items-start gap-3">
      <Avatar className="mt-0.5 h-8 w-8 shrink-0 select-none">
        <Logo />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>

      <div className="relative flex max-w-[85%] flex-col items-start gap-2">
        <div className="relative flex flex-col gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function useImageUpload() {
  const [attachments, setAttachments] = useState<UploadingImage[]>([]);

  const handleImageUpload = useCallback(async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    const newAttachment: UploadingImage = {
      url: localUrl,
      name: file.name,
      contentType: file.type,
      localUrl,
      uploading: true,
    };

    setAttachments((prev) => [...prev, newAttachment]);

    try {
      const url = await uploadImage(file);
      if (!url) throw new Error('Failed to upload image');

      setAttachments((prev) =>
        prev.map((att) =>
          att.localUrl === localUrl ? { ...att, url, uploading: false } : att,
        ),
      );
    } catch (error) {
      console.error('Failed to upload image:', error);
      setAttachments((prev) => prev.filter((att) => att.localUrl !== localUrl));
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }, []);

  const removeAttachment = useCallback((localUrl: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((att) => att.localUrl === localUrl);
      if (attachment) {
        URL.revokeObjectURL(attachment.localUrl);
      }
      return prev.filter((att) => att.localUrl !== localUrl);
    });
  }, []);

  useEffect(() => {
    return () => {
      attachments.forEach((att) => {
        if (att.uploading) {
          URL.revokeObjectURL(att.localUrl);
        }
      });
    };
  }, [attachments]);

  return {
    attachments,
    setAttachments,
    handleImageUpload,
    removeAttachment,
  };
}

export default function ChatInterface({
  id,
  initialMessages = [],
}: {
  id: string;
  initialMessages?: Message[];
}) {
  const { messages, input, handleSubmit, handleInputChange, isLoading } =
    useChat({
      id,
      initialMessages,
      body: { id },
      onFinish: () => {
        window.history.replaceState({}, '', `/chat/${id}`);
        // Refresh wallet portfolio after AI response
        refresh();
      },
    });

  const [previewImage, setPreviewImage] = useState<ImagePreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { attachments, setAttachments, handleImageUpload, removeAttachment } =
    useImageUpload();
  const {
    data: portfolio,
    isLoading: isPortfolioLoading,
    refresh,
  } = useWalletPortfolio();

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      await Promise.all(files.map(handleImageUpload));

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleImageUpload],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageFiles = items
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      await Promise.all(imageFiles.map(handleImageUpload));
    },
    [handleImageUpload],
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    if (attachments.some((att) => att.uploading)) return;

    const currentAttachments = attachments.map(
      ({ url, name, contentType }) => ({
        url,
        name,
        contentType,
      }),
    );
    setAttachments([]);
    await handleSubmit(e, { experimental_attachments: currentAttachments });
    scrollToBottom();
  };

  useAnimationEffect();

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar relative flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl">
          <div className="space-y-4 px-4 pb-36 pt-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                index={index}
                messages={messages}
                onPreviewImage={setPreviewImage}
              />
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role !== 'assistant' && (
                <LoadingMessage />
              )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/95 to-background/0" />
        <div className="relative mx-auto w-full max-w-3xl px-4 py-4">
          {/* Floating Wallet */}
          {portfolio && (
            <FloatingWallet data={portfolio} isLoading={isPortfolioLoading} />
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-muted">
              {attachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto rounded-t-2xl bg-muted/50 p-3">
                  {attachments.map((attachment) => (
                    <AttachmentPreview
                      key={attachment.localUrl}
                      attachment={attachment}
                      onRemove={() => removeAttachment(attachment.localUrl)}
                    />
                  ))}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) {
                    handleInputChange(e);
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    handleFormSubmit(e);
                  }
                }}
                onPaste={handlePaste}
                placeholder="Send a message..."
                className={cn(
                  'min-h-[100px] w-full resize-none border-0 bg-transparent px-4 py-[1.3rem] focus-visible:ring-0',
                  attachments.length > 0 ? 'rounded-t-none' : 'rounded-t-2xl',
                )}
                maxLength={MAX_CHARS}
              />

              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isLoading}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  disabled={
                    (!input.trim() && attachments.length === 0) ||
                    isLoading ||
                    attachments.some((att) => att.uploading)
                  }
                  className="h-8 w-8 hover:bg-muted"
                >
                  <SendHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {input.length}/{MAX_CHARS}
            </div>
          </form>
        </div>
      </div>

      <ImagePreviewDialog
        previewImage={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
