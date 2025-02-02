'use client';

import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Image from 'next/image';

import { SavedPrompt } from '@prisma/client';
import { Attachment, JSONValue, Message } from 'ai';
import { useChat } from 'ai/react';
import {
  Bookmark,
  Image as ImageIcon,
  Loader2,
  SendHorizontal,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

import { getToolConfig } from '@/ai/providers';
import { TokenCard } from '@/ai/solana/jupiter';
import { Confirmation } from '@/components/confimation';
import { FloatingWallet } from '@/components/floating-wallet';
import Logo from '@/components/logo';
import CreateActionMessage from '@/components/message/create-action/create-action';
import { LaunchResult } from '@/components/message/pumpfun-launch/launch-result';
import { SwapCard } from '@/components/message/swap/swap-card';
import { ToolResult } from '@/components/message/tool-result';
import { TransferCard } from '@/components/message/transfer/transfer-card';
import { SavedPromptsMenu } from '@/components/saved-prompts-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import usePolling from '@/hooks/use-polling';
import { StreamingState, useStreamingState } from '@/hooks/use-streaming-state';
import { useUser } from '@/hooks/use-user';
import { useWalletPortfolio } from '@/hooks/use-wallet-portfolio';
import { EVENTS } from '@/lib/events';
import { uploadImage } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { getMessageIdFromAnnotations } from '@/lib/utils/ai';
import { generateUUID } from '@/lib/utils/format';
import {
  createSavedPrompt,
  getSavedPrompts,
  setSavedPromptLastUsedAt,
} from '@/server/actions/saved-prompt';
import { DataStreamDelta } from '@/types/stream';
import { type ToolActionResult, ToolUpdate } from '@/types/util';

import { ConversationInput } from '../../home/conversation-input';

const TOOL_COMPONENTS: Record<string, React.FC<any>> = {
  swapTokens: SwapCard,
  searchTokenByName: TokenCard,
  launchPumpFun: LaunchResult,
  createAction: CreateActionMessage,
  transferTokens: TransferCard,
};

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

interface ToolResult {
  toolCallId: string;
  result: any;
}

interface ChatMessageProps {
  message: Message;
  index: number;
  messages: Message[];
  setSavedPrompts: React.Dispatch<SetStateAction<SavedPrompt[]>>;
  onPreviewImage: (preview: ImagePreview) => void;
  addToolResult: (result: ToolResult) => void;
  append: (message: Message) => void;
  statesById: Record<string, StreamingState>;
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
  result?: any;
  state?: string;
  args?: any;
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

const applyToolUpdates = (messages: Message[], toolUpdates: ToolUpdate[]) => {
  while (toolUpdates.length > 0) {
    const update = toolUpdates.pop();
    if (!update) {
      continue;
    }

    if (update.type === 'tool-update') {
      messages.forEach((msg) => {
        const toolInvocation = msg.toolInvocations?.find(
          (tool) => tool.toolCallId === update.toolCallId,
        ) as ToolInvocation | undefined;

        if (toolInvocation) {
          if (!toolInvocation.result) {
            toolInvocation.result = {
              result: update.result,
              message: toolInvocation.args?.message, // TODO: Don't think this is technically correct, but shouldn't affect UI
            };
          } else {
            toolInvocation.result.result = update.result;
          }
        }
      });
    }
  }

  return messages;
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
  messageId,
  toolInvocations,
  addToolResult,
  append,
  hasContent,
  statesById,
}: {
  messageId: string;
  toolInvocations: ToolInvocation[];
  addToolResult: (result: ToolResult) => void;
  append: (message: Message) => void;
  hasContent: boolean;
  statesById: Record<string, StreamingState>;
}) {
  return (
    <div className="w-full space-y-px">
      {toolInvocations.map(
        ({ toolCallId, toolName, displayName, result, state, args }, index) => {
          if (toolName in TOOL_COMPONENTS) {
            return renderToolInvocation(
              { toolCallId, toolName, displayName, result, state, args },
              statesById[toolCallId],
              messageId,
              append,
              hasContent || index > 0,
            );
          }
          const toolResult = result as ToolActionResult;
          if (toolName === 'askForConfirmation') {
            return (
              <div key={toolCallId} className="group">
                <Confirmation
                  message={args?.message}
                  result={toolResult?.result}
                  toolCallId={toolCallId}
                  addResultUtility={(result) =>
                    addToolResult({
                      toolCallId,
                      result: { result, message: args?.message },
                    })
                  }
                />
              </div>
            );
          }
          const isCompleted = result !== undefined;
          const isError =
            isCompleted &&
            typeof result === 'object' &&
            result !== null &&
            'error' in result;

          const config = getToolConfig(toolName);

          // Handle unknown tool with no config
          if (!config) {
            const header = (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-destructive/20',
                  )}
                />
                <span className="truncate text-xs font-medium text-foreground/90">
                  Tool Error
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                  {toolCallId.slice(0, 9)}
                </span>
              </div>
            );

            return (
              <div key={toolCallId} className="group">
                <ToolResult
                  toolName="Tool Error"
                  result={{
                    result: 'Tool Error',
                    error:
                      'An error occurred while processing your request, please try again or adjust your phrasing.',
                  }}
                  header={header}
                />
              </div>
            );
          }

          const finalDisplayName = displayName || config?.displayName;

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
        },
      )}
    </div>
  );
}

function ChatMessage({
  message,
  index,
  messages,
  setSavedPrompts,
  onPreviewImage,
  addToolResult,
  append,
  statesById,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasAttachments =
    message.experimental_attachments &&
    message.experimental_attachments.length > 0;
  const showAvatar =
    !isUser && (index === 0 || messages[index - 1].role === 'user');
  const isConsecutive = index > 0 && messages[index - 1].role === message.role;
  const { user } = useUser();

  async function handleSavePrompt() {
    if (!user) {
      toast.error('Unauthorized');
      return;
    }

    toast.promise(
      createSavedPrompt({
        title: message.content.trim().slice(0, 30) + '...',
        content: message.content.trim(),
      }).then((res: any) => {
        if (!res?.data?.data) {
          throw new Error();
        }

        const savedPrompt = res?.data?.data;
        setSavedPrompts((old) => [...old, savedPrompt]);
      }),
      {
        loading: 'Saving prompt...',
        success: 'Prompt saved',
        error: 'Failed to save prompt',
      },
    );
  }

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
          'group relative flex max-w-[85%] flex-row items-center',
          isUser ||
            !message.toolInvocations ||
            message.toolInvocations.length === 0
            ? ''
            : 'w-full',
        )}
      >
        {isUser && (
          <button
            onClick={handleSavePrompt}
            className="mr-1 hidden pb-4 pl-4 pr-2 pt-4 group-hover:block hover:text-favorite"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        )}
        <div
          className={cn(
            'relative w-full gap-2',
            isUser ? 'items-end' : 'items-start',
          )}
        >
          {hasAttachments && (
            <div
              className={cn('w-full max-w-[400px]', message.content && 'mb-2')}
            >
              <MessageAttachments
                attachments={message.experimental_attachments!}
                messageId={getMessageIdFromAnnotations(message)}
                onPreviewImage={onPreviewImage}
              />
            </div>
          )}

          {message.content && (
            <div
              className={cn(
                'relative flex w-full flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm',
                isUser ? 'bg-primary' : 'bg-muted/60',
              )}
            >
              <div
                className={cn(
                  'prose prose-sm max-w-prose break-words leading-tight md:prose-base',
                  isUser
                    ? 'prose-invert dark:prose-neutral'
                    : 'prose-neutral dark:prose-invert',
                )}
              >
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        ref={undefined}
                      />
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

                      const width = isThumbnail ? 40 : 200;
                      const height = isThumbnail ? 40 : 200;

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
            <MessageToolInvocations
              messageId={getMessageIdFromAnnotations(message)}
              toolInvocations={message.toolInvocations}
              addToolResult={addToolResult}
              append={append}
              hasContent={!!message.content}
              statesById={statesById}
            />
          )}
        </div>
      </div>
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

export default function ChatInterface({
  id,
  initialMessages = [],
}: {
  id: string;
  initialMessages?: Message[];
}) {
  const {
    messages: chatMessages,
    input,
    handleSubmit,
    handleInputChange,
    isLoading,
    addToolResult,
    setInput,
    setMessages,
    append,
  } = useChat({
    id,
    maxSteps: 10,
    initialMessages,
    sendExtraMessageFields: true,
    body: { id },
    onFinish: () => {
      if (window.location.pathname === `/chat/${id}`) {
        window.history.replaceState({}, '', `/chat/${id}`);
      }
      // Refresh wallet portfolio after AI response
      refresh();

      // Dispatch event to mark conversation as read
      window.dispatchEvent(new CustomEvent(EVENTS.CONVERSATION_READ));
    },
    experimental_prepareRequestBody: ({ messages }) => {
      return {
        message: messages[messages.length - 1],
        id,
      } as unknown as JSONValue;
    },
  });
  const { statesById } = useStreamingState();

  const isStreaming = Object.values(statesById).find(
    (s) => s.status === 'streaming',
  );

  const messages = chatMessages;

  // Use polling for fetching new messages
  usePolling({
    url: `/api/chat/${id}`,
    onUpdate: (data: Message[]) => {
      if (!data) {
        return;
      }

      if (data && data.length) {
        setMessages(data);
      }

      window.dispatchEvent(new CustomEvent(EVENTS.CONVERSATION_READ));
    },
  });

  const [previewImage, setPreviewImage] = useState<ImagePreview | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  scrollToBottom();

  const handleSend = async (value: string, attachments: Attachment[]) => {
    if (!value.trim() && (!attachments || attachments.length === 0)) {
      return;
    }

    // Create a synthetic event for handleSubmit
    const fakeEvent = {
      preventDefault: () => {},
      type: 'submit',
    } as React.FormEvent;

    // Prepare message data with attachments if present
    const currentAttachments = attachments.map(
      ({ url, name, contentType }) => ({
        url,
        name,
        contentType,
      }),
    );

    // Submit the message
    await handleSubmit(fakeEvent, {
      data: value,
      experimental_attachments: currentAttachments,
    });
    scrollToBottom();
  };

  useAnimationEffect();

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar relative flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl">
          <div className="space-y-4 px-4 pb-36 pt-4">
            {messages.map((message, index) => {
              if (message.role === 'data') {
                return null;
              }
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  index={index}
                  messages={messages}
                  setSavedPrompts={setSavedPrompts}
                  onPreviewImage={setPreviewImage}
                  addToolResult={addToolResult}
                  append={append}
                  statesById={statesById}
                />
              );
            })}
            {isLoading &&
              !isStreaming &&
              messages[messages.length - 1]?.role !== 'assistant' &&
              messages[messages.length - 1]?.role !== 'data' && (
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

          <ConversationInput
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            onChat={true}
            savedPrompts={savedPrompts}
            setSavedPrompts={setSavedPrompts}
          />
        </div>
      </div>

      <ImagePreviewDialog
        previewImage={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}

const renderToolInvocation = (
  toolInvocation: ToolInvocation,
  toolStreamState: StreamingState | undefined,
  messageId: string,
  append: (message: Message) => void,
  includeTopMargin: boolean,
) => {
  if (!(toolInvocation.toolName in TOOL_COMPONENTS)) {
    return null;
  }
  const ToolComponent = TOOL_COMPONENTS[toolInvocation.toolName];

  const customAddResult = async (result: DataStreamDelta) => {
    append({
      id: generateUUID(),
      role: 'data',
      content: '',
      data: {
        result: result as unknown as JSONValue,
        toolCallId: toolInvocation.toolCallId,
        toolName: toolInvocation.toolName,
        messageId,
      },
    });
  };

  if (
    toolInvocation.state === 'result' &&
    toolStreamState?.toolCallId === toolInvocation.toolCallId &&
    (toolStreamState.status === 'streaming' ||
      toolStreamState.status === 'idle')
  ) {
    toolInvocation.result = {
      result: {
        ...toolInvocation.result.result,
        ...toolStreamState.result,
      },
    };
  }

  const data =
    toolInvocation.state === 'result'
      ? toolInvocation.result
      : {
          success: true,
          result: toolStreamState?.result,
        };

  // if (data.result.step === "canceled") {
  //   return null;
  // }

  const inProgress =
    toolInvocation.state !== 'result' ||
    toolStreamState?.status === 'streaming';
  return (
    <div
      key={toolInvocation.toolCallId}
      className={cn('group w-full', includeTopMargin ? 'my-4' : '')}
    >
      <div
        className={cn(
          includeTopMargin ? 'mt-2' : '',
          inProgress ? '' : 'w-full',
        )}
      >
        <div
          className={
            inProgress ? '' : 'w-full rounded-lg bg-muted/40 px-3 py-2'
          }
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full ring-2',
                inProgress
                  ? 'animate-pulse bg-amber-500 ring-amber-500/20'
                  : 'bg-emerald-500 ring-emerald-500/20',
              )}
            />
            <span className="truncate text-xs font-medium text-foreground/90">
              {toolInvocation.toolName}
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
              {toolInvocation.toolCallId.slice(0, 9)}
            </span>
          </div>
        </div>
        <div className="mt-2 sm:px-4">
          {data === undefined && (
            <div className="mt-px px-3">
              <div className="h-20 animate-pulse rounded-lg bg-muted/40" />
            </div>
          )}
          {data !== undefined && (
            <ToolComponent data={data} addToolResult={customAddResult} />
          )}
        </div>
      </div>
    </div>
  );
};
