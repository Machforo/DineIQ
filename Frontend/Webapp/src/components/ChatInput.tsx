import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Send, Mic } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      textareaRef.current?.focus();
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto'; // Reset height
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`; // Limit max height
    setMessage(target.value);
  };

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  return (
    <div className="flex gap-2 items-end bg-gray-100 p-2 rounded-[2rem] border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-inner">
      <button className="p-3 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-200">
        <Mic className="w-5 h-5" />
      </button>

      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 text-sm font-medium text-gray-800 placeholder:text-gray-400 max-h-[120px] outline-none"
        style={{ height: '44px' }}
      />

      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 shadow-md transform ${message.trim() && !disabled
          ? "bg-primary text-white hover:scale-105 hover:shadow-lg"
          : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
      >
        <Send className="w-5 h-5 ml-0.5" />
      </button>
    </div>
  );
}

