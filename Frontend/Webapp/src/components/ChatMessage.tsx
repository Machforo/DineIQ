import { ChatMessage as ChatMessageType } from "@/utils/chatUtils";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === 'ai';

  return (
    <div
      className={cn(
        "flex w-full mb-6 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      {/* Avatar for AI */}
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E23744] to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-5 py-3 shadow-sm relative group text-sm leading-relaxed",
          isAI
            ? "bg-white text-gray-800 rounded-tl-sm border border-gray-100" // AI Bubble
            : "bg-[#E23744] text-white rounded-tr-sm shadow-md" // User Bubble (Zomato Red)
        )}
      >
        <p className="whitespace-pre-wrap break-words font-medium">
          {message.content}
        </p>
        <span className={cn(
          "text-[10px] mt-1.5 block opacity-0 group-hover:opacity-60 transition-opacity absolute -bottom-5 min-w-max",
          isAI ? "left-0 text-gray-400" : "right-0 text-gray-400"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Avatar for User */}
      {!isAI && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </div>
  );
}

