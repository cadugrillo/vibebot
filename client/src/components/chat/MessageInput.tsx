import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { MessageInputProps } from './types';

const MIN_HEIGHT = 60; // px
const MAX_HEIGHT = 200; // px
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  loading = false,
  placeholder = 'Type a message...',
  maxLength = 10000,
  showCharacterCount = false,
  allowFileUpload = false,
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const canSend = (content.trim().length > 0 || files.length > 0) && !disabled && !loading;

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height based on content
    const newHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);

    // Set the new height
    textarea.style.height = `${newHeight}px`;

    // Enable scrolling if content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [content]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Send stop event on unmount if currently typing
      if (isTypingRef.current && onTypingStop) {
        onTypingStop();
      }
    };
  }, [onTypingStop]);

  // Handle content changes and typing events
  const handleContentChange = (value: string) => {
    setContent(value);

    // Only send typing events if callbacks are provided
    if (!onTypingStart || !onTypingStop) return;

    // Start typing event when user types
    if (value.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          onTypingStop();
        }
      }, 3000);
    } else {
      // Immediately stop typing if content is empty
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop();
      }
    }
  };

  const handleSend = () => {
    if (!canSend) return;

    const trimmedContent = content.trim();

    // Can send with text, files, or both
    if (trimmedContent || files.length > 0) {
      // Stop typing indicator before sending
      if (isTypingRef.current && onTypingStop) {
        isTypingRef.current = false;
        onTypingStop();
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      onSend(trimmedContent, files.length > 0 ? files : undefined);

      // Clear all input state after successful send
      setContent('');
      setFiles([]);
      setFileError('');

      // Reset textarea height to minimum
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`;
        // Return focus to textarea for immediate next message
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keyboard shortcuts:
    // - Enter: Send message (if enabled)
    // - Shift+Enter: Insert newline
    // - Ctrl/Cmd+Enter: Send message (alternative)

    const isSendShortcut =
      (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) ||
      (e.key === 'Enter' && (e.ctrlKey || e.metaKey));

    if (isSendShortcut) {
      e.preventDefault();

      // Only send if message can be sent
      if (canSend) {
        handleSend();
      }
    }

    // Shift+Enter creates a newline (default textarea behavior)
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;

    // Respect max length
    if (newContent.length <= maxLength) {
      handleContentChange(newContent);
    }
  };

  // File validation helper
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return `File type not supported. Please upload: ${ACCEPTED_FILE_TYPES.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  // Handle file selection from input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFileError('');

    for (const file of selectedFiles) {
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
    }

    setFiles((prev) => [...prev, ...selectedFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste event for images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!allowFileUpload) return;

    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();
    setFileError('');

    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) return;

      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }

      setFiles((prev) => [...prev, file]);
    });
  };

  // Remove file from list
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError('');
  };

  // Trigger file input click
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const characterCount = content.length;
  const percentUsed = (characterCount / maxLength) * 100;

  // Color thresholds for character count
  const getCharCountColor = () => {
    if (percentUsed >= 95) return 'text-destructive font-medium'; // Red, bold at 95%+
    if (percentUsed >= 80) return 'text-yellow-600 dark:text-yellow-500'; // Yellow at 80%+
    return 'text-muted-foreground'; // Normal gray
  };

  return (
    <div className=" border-border bg-background p-4">
      <div
        className={`mx-auto max-w-4xl transition-opacity ${loading ? 'opacity-60 cursor-wait' : ''}`}
      >
        {/* File previews */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2"
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground max-w-[200px] truncate">
                  {file.name}
                </span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  disabled={loading || disabled}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Remove ${file.name}`}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File error message */}
        {fileError && (
          <div className="mb-2 text-sm text-destructive" role="alert">
            {fileError}
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={loading ? 'Sending message...' : placeholder}
              disabled={disabled || loading}
              className="resize-none overflow-hidden"
              style={{ height: `${MIN_HEIGHT}px` }}
            />
            {showCharacterCount && (
              <div
                className={`mt-1 text-xs text-right transition-colors ${getCharCountColor()}`}
                role="status"
                aria-live="polite"
                aria-label={`Character count: ${characterCount} of ${maxLength}`}
              >
                {characterCount} / {maxLength}
                {percentUsed >= 95 && (
                  <span className="ml-1">({Math.round(100 - percentUsed)}% remaining)</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-end gap-2">
            {/* File upload button */}
            {allowFileUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES.join(',')}
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload files"
                />
                <Button
                  onClick={handleFileButtonClick}
                  disabled={disabled || loading}
                  size="icon"
                  variant="outline"
                  className="h-[60px] w-[60px]"
                  title="Attach files (or paste images)"
                  type="button"
                >
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach files</span>
                </Button>
              </>
            )}

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="icon"
              className="h-[80px] w-[80px]"
              title={
                loading
                  ? 'Sending...'
                  : !content.trim() && files.length === 0
                    ? 'Enter a message or attach files to send'
                    : disabled
                      ? 'Input is disabled'
                      : 'Send message (Enter or Ctrl+Enter)'
              }
              aria-label={
                loading
                  ? 'Sending message'
                  : !canSend
                    ? 'Send button disabled'
                    : 'Send message'
              }
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span className="sr-only">
                {loading ? 'Sending message...' : 'Send message'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
