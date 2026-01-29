import { Bot, Sparkles } from "lucide-react";
import { useState } from "react";

export default function AIButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="floating-button w-14 h-14 bg-primary bottom-24 right-4 animate-bounce-subtle"
        style={{ animationDuration: "3s" }}
      >
        <Bot className="w-7 h-7 text-primary-foreground" />
        <span className="absolute -top-1 -right-1">
          <Sparkles className="w-4 h-4 text-gold" />
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-card w-full max-w-lg rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">AI Food Assistant</h3>
                <p className="text-sm text-muted-foreground">Personalized recommendations</p>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-4 mb-4">
              <p className="text-foreground text-sm">
                "Based on your party of <strong>2 guests</strong>, I'd recommend our <strong>Paneer Feast Combo</strong> - 
                it's perfect for sharing and saves you ₹200!"
              </p>
            </div>

            <div className="space-y-2">
              <button className="w-full text-left p-3 rounded-xl border border-border hover:bg-secondary transition-colors">
                <span className="text-sm font-medium">🌱 Suggest vegetarian options</span>
              </button>
              <button className="w-full text-left p-3 rounded-xl border border-border hover:bg-secondary transition-colors">
                <span className="text-sm font-medium">🎉 Best dishes for a celebration</span>
              </button>
              <button className="w-full text-left p-3 rounded-xl border border-border hover:bg-secondary transition-colors">
                <span className="text-sm font-medium">💰 Budget-friendly combos</span>
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-4 py-3 text-muted-foreground font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
