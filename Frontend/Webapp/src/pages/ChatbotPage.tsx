import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SessionControls } from "@/components/SessionControls";
import {
  ChatMessage as ChatMessageType,
  ClientInfo,
  ChatSession,
  createSessionObject,
  saveChatToBackend,
} from "@/utils/chatUtils";
import { useToast } from "@/hooks/use-toast";
import { Bot, ChevronLeft, Sparkles, User, MoreVertical } from "lucide-react";

const ChatbotPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({ name: "", email: "", phone: "" });
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){1,2}\d{3,4}/g;

  useEffect(() => {
    const greeting: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'ai',
      content: `Hello! Welcome to DineIQ. I'm your personal food concierge. How can I help you discover delicious meals today?`,
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const extractClientInfo = (content: string) => {
    setClientInfo(prev => {
      const updated = { ...prev };
      if (!prev.email) {
        const emailMatch = content.match(emailRegex);
        if (emailMatch) updated.email = emailMatch[0];
      }
      if (!prev.phone) {
        const phoneMatch = content.match(phoneRegex);
        if (phoneMatch?.length) updated.phone = phoneMatch[0];
      }
      if (!prev.name) {
        const nameMatch = content.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/);
        if (nameMatch) updated.name = nameMatch[0];
      }
      return updated;
    });
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    extractClientInfo(content);
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/chatbot/llm-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatHistory: messages.map(msg => ({ role: msg.role, text: msg.content })),
          userMessage: content,
          clientName: clientInfo.name || "Guest"
        })
      });

      if (!response.ok) throw new Error("Failed AI response");

      const data = await response.json();
      const aiMessage: ChatMessageType = {
        id: `msg-${Date.now()}`,
        role: 'ai',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({ title: "Error", description: "AI could not respond", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    if (messages.length > 1 && !window.confirm("Start new chat? Current session will be lost.")) return;
    setMessages([{
      id: `msg-${Date.now()}`,
      role: 'ai',
      content: `Hello! I'm ready to help you find the perfect meal.`,
      timestamp: new Date()
    }]);
    setClientInfo({ name: "", email: "", phone: "" });
    setSessionStartTime(new Date());
    toast({ title: "New chat started" });
  };

  const handleEndChat = async () => {
    try {
      const session = createSessionObject(messages, clientInfo, sessionStartTime);
      const result = await saveChatToBackend(session);
      if (result.status === "success") {
        setCurrentSession(session);
        setIsModalOpen(true);
        toast({ title: "Chat saved", description: `Chat ID: ${result.chatId}` });
      } else {
        toast({ title: "Error", description: result.message || "Could not save chat", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Unexpected failure", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F2] relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-50 via-transparent to-transparent pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
        <div className="container p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E23744] to-pink-500 flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900 leading-none">DineIQ AI</h1>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-gold animate-pulse" />
                  <p className="text-xs font-bold text-gray-500">Concierge</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SessionControls onStartNew={handleStartNew} onEndChat={handleEndChat} hasMessages={messages.length > 1} />
          </div>
        </div>
      </header>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          <div className="text-center py-4">
            <div className="inline-block bg-gray-200/50 rounded-full px-4 py-1.5 text-xs text-gray-500 font-medium">
              Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in pl-2">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* CHAT INPUT */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40 safe-bottom">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSendMessage} disabled={loading} />
          <p className="text-[10px] text-center text-gray-400 mt-2 font-medium">
            AI can make mistakes. Please check menu info.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ChatbotPage;
