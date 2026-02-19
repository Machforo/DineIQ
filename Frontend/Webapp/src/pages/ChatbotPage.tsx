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
        timestamp: new Date(),
        combos: data.combos && data.combos.length > 0 ? data.combos : undefined,
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

  const quickPrompts = [
    "🍱 Make me a combo meal",
    "🌶️ Best spicy starters",
    "🥗 Vegan options only",
    "🍛 Today's specials",
    "🍰 What desserts do you have?",
    "💰 Something under ₹500",
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F2] relative overflow-hidden">
      {/* Background Pattern - Subtle Zomato Doodle-like */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('https://b.zmtcdn.com/web_assets/81f3ff974d82520780078ba1cfbd453a1583259680.png')]" />

      {/* HEADER - Clean & Premium */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E23744] to-pink-600 flex items-center justify-center shadow-md border-2 border-white">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
              </div>
              <div>
                <h1 className="text-base font-black text-gray-900 leading-tight">DineIQ Concierge</h1>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wide uppercase">Online & Ready</p>
                </div>
              </div>
            </div>
          </div>

          <SessionControls onStartNew={handleStartNew} onEndChat={handleEndChat} hasMessages={messages.length > 1} />
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
        <div className="max-w-2xl mx-auto flex flex-col justify-end min-h-full pb-0">

          {/* Timestamp Divider */}
          <div className="text-center py-6">
            <span className="bg-gray-200/50 px-3 py-1 rounded-full text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Today
            </span>
          </div>

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onSend={handleSendMessage} />
            ))}

            {/* AI Loading Indicator */}
            {loading && (
              <div className="flex justify-start animate-fade-in pl-2">
                <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-100 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

        </div>
      </div>

      {/* FOOTER INPUT AREA */}
      <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-40">
        <div className="max-w-2xl mx-auto">

          {/* Quick Prompts (Show only if conversation is short) */}
          {messages.length <= 2 && !loading && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3 pb-1">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="whitespace-nowrap px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:bg-[#E23744] hover:text-white hover:border-[#E23744] transition-all active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <ChatInput onSend={handleSendMessage} disabled={loading} />

          <p className="text-[10px] text-center text-gray-400 mt-2 font-medium flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-gold" />
            AI-powered suggestions may vary.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ChatbotPage;
