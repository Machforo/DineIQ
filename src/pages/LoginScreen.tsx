import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Phone, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useUser();
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- LOGIN LOGIC ---
  const handleLogin = () => {
    if (mobile.length === 10) {
      setIsLoading(true);
      setTimeout(() => {
        login("Guest User", mobile);
        navigate("/home");
      }, 1000);
    }
  };

  // --- REGISTER LOGIC ---
  const handleRegister = () => {
    if (mobile.length === 10 && name) {
      setIsLoading(true);
      setTimeout(() => {
        login(name, mobile);
        navigate("/home");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative font-sans">
      
      {/* 1. TOP BANNER (Food Image) */}
      <div className="h-[35vh] relative w-full overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80" 
          alt="Delicious Food" 
          className="w-full h-full object-cover"
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute bottom-8 left-6 right-6 text-white animate-fade-in">
           <h1 className="text-4xl font-black tracking-tighter mb-1">DineIQ <span className="text-[#E23744]">Kitchen</span></h1>
           <p className="text-gray-300 text-sm font-medium">India's #1 Table Ordering App</p>
        </div>
      </div>

      {/* 2. MAIN CARD (Overlapping) */}
      <div className="flex-1 bg-white rounded-t-[30px] -mt-6 relative z-10 px-6 pt-8 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-slide-up">
        
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />

        {/* TABS (Login / Sign Up) */}
        <div className="flex bg-gray-50 p-1.5 rounded-xl mb-8 border border-gray-100">
           <button 
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${
                 activeTab === "login" 
                 ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" 
                 : "text-gray-500 hover:text-gray-700"
              }`}
           >
              Log in
           </button>
           <button 
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${
                 activeTab === "register" 
                 ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" 
                 : "text-gray-500 hover:text-gray-700"
              }`}
           >
              Sign up
           </button>
        </div>

        {/* FORM CONTENT */}
        <div className="space-y-5">
           
           {/* Header Text */}
           <div className="mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                 {activeTab === "login" ? "Welcome Back!" : "Create Account"}
              </h2>
              <p className="text-gray-500 text-sm">
                 {activeTab === "login" ? "Order delicious food instantly" : "Fill details to start ordering"}
              </p>
           </div>

           {/* Input Fields */}
           {activeTab === "register" && (
              <div className="space-y-4 animate-fade-in">
                 <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E23744] transition-colors" size={20} />
                    <Input 
                       placeholder="Full Name" 
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="pl-12 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] focus:bg-white rounded-xl font-medium text-lg transition-all"
                    />
                 </div>
                 <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E23744] transition-colors" size={20} />
                    <Input 
                       placeholder="Email (Optional)" 
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="pl-12 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] focus:bg-white rounded-xl font-medium text-lg transition-all"
                    />
                 </div>
              </div>
           )}

           {/* Mobile Number (Common) */}
           <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
                 <span className="font-bold text-gray-900">+91</span>
              </div>
              <Input 
                 type="tel"
                 maxLength={10}
                 placeholder="Mobile Number" 
                 value={mobile}
                 onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                 className="pl-24 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] focus:bg-white rounded-xl font-bold text-lg tracking-wide transition-all"
              />
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E23744]" size={20} />
           </div>

           {/* CTA Button */}
           <Button 
              onClick={activeTab === "login" ? handleLogin : handleRegister}
              disabled={mobile.length !== 10 || (activeTab === "register" && !name) || isLoading}
              className="w-full h-14 bg-[#E23744] hover:bg-[#d32f3c] text-white font-bold text-lg rounded-xl shadow-lg shadow-red-200 mt-4 transition-all active:scale-[0.98]"
           >
              {isLoading ? (
                 <><Loader2 className="animate-spin mr-2" /> Processing...</>
              ) : (
                 <>{activeTab === "login" ? "Login to Order" : "Continue"} <ArrowRight className="ml-2 w-5 h-5" /></>
              )}
           </Button>

           {/* Terms Footer */}
           <p className="text-center text-[11px] text-gray-400 mt-6 leading-relaxed">
              By continuing, you agree to our <br/>
              <span className="text-gray-600 font-semibold underline cursor-pointer">Terms of Service</span> & <span className="text-gray-600 font-semibold underline cursor-pointer">Privacy Policy</span>
           </p>

        </div>
      </div>
    </div>
  );
}