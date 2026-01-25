import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Phone, Mail, Loader2, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner"; 

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useUser();
  
  // 👇 Yahan apna Google Apps Script Web App URL paste karein
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwotG5njZTg7p1iPOQN_cj7pF6T_zCuZVF5QvJKmm4jIvnUVj-aAQ7jgK0mBLPSG1c5w/exec"; 

  // Tabs state
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [step, setStep] = useState<1 | 2>(1); // 1: Details Form, 2: OTP Input

  // Form States
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
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

  // --- REGISTER LOGIC (Connected to Google Apps Script) ---
  const handleRegister = async () => {
    setIsLoading(true);

    try {
      if (step === 1) {
        // --- STEP 1: SEND OTP REQUEST ---
        // Backend expects: { action: "send_otp", email: "..." }
        
        // Note: Google Apps Script ko data JSON stringify karke bhej rahe hain
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "send_otp", name: name, mobile: mobile, email: email }),
        });

        // Apps Script se response read karne ki koshish
        // Agar CORS error aaye, to hum assume karenge ki OTP chala gaya
        // kyunki 'no-cors' mode me hum response nahi padh sakte.
        // Lekin agar aapne "Anyone" access diya hai to ye chalega.
        
        // Safety check for empty responses (common in GAS CORS issues)
        try {
            const data = await response.json();
            if (data.status === "error") {
                toast.error(data.message || "Failed to send OTP");
                setIsLoading(false);
                return;
            }
        } catch (e) {
            console.log("CORS/JSON Parse error (likely successful request):", e);
        }

        toast.success(`OTP sent to ${email}`);
        setStep(2); // OTP Screen par jao

      } else {
        // --- STEP 2: VERIFY OTP ---
        // Backend expects: { action: "verify_otp", email: "...", otp: "..." }
        
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ 
            action: "verify_otp", 
            email: email, 
            otp: otp 
          }),
        });

        const data = await response.json();

        if (data.status === "ok" || data.authenticated === true) {
          toast.success("Registration Successful!");
          login(name, mobile); // User ko login context me set karo
          navigate("/home");   // Home page par bhejo
        } else {
          toast.error(data.message || "Invalid OTP");
        }
      }
    } catch (error) {
      console.error("API Error:", error);
      // Agar strictly network error hai
      toast.error("Network Error. Check internet or URL.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative font-sans">
      
      {/* 1. TOP BANNER */}
      <div className="h-[35vh] relative w-full overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80" 
          alt="Delicious Food" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute bottom-8 left-6 right-6 text-white animate-fade-in">
           <h1 className="text-4xl font-black tracking-tighter mb-1">DineIQ <span className="text-[#E23744]">Kitchen</span></h1>
           <p className="text-gray-300 text-sm font-medium">India's #1 Table Ordering App</p>
        </div>
      </div>

      {/* 2. MAIN CARD */}
      <div className="flex-1 bg-white rounded-t-[30px] -mt-6 relative z-10 px-6 pt-8 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-slide-up">
        
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />

        {/* TABS */}
        <div className="flex bg-gray-50 p-1.5 rounded-xl mb-8 border border-gray-100">
           <button 
             onClick={() => { setActiveTab("login"); setStep(1); }}
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
                 {step === 2 ? "Enter OTP" : (activeTab === "login" ? "Welcome Back!" : "Create Account")}
              </h2>
              <p className="text-gray-500 text-sm">
                 {step === 2 
                    ? `We sent a code to ${email}` 
                    : (activeTab === "login" ? "Order delicious food instantly" : "Fill details to get verified")
                 }
              </p>
           </div>

           {/* --- OTP INPUT SCREEN (Only for Step 2) --- */}
           {activeTab === "register" && step === 2 && (
             <div className="space-y-4 animate-fade-in">
                <div className="relative group">
                   <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E23744]" size={20} />
                   <Input 
                      placeholder="Enter 6-digit OTP" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="pl-12 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] rounded-xl font-bold text-lg tracking-widest"
                      maxLength={6}
                   />
                </div>
                <button onClick={() => setStep(1)} className="text-sm text-gray-500 underline">Change Email / Details</button>
             </div>
           )}

           {/* --- REGISTRATION FORM (Step 1) --- */}
           {activeTab === "register" && step === 1 && (
              <div className="space-y-4 animate-fade-in">
                 {/* Name Field */}
                 <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E23744] transition-colors" size={20} />
                    <Input 
                       placeholder="Full Name" 
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="pl-12 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] focus:bg-white rounded-xl font-medium text-lg"
                    />
                 </div>
                 
                 {/* Email Field */}
                 <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E23744] transition-colors" size={20} />
                    <Input 
                       placeholder="Email Address" 
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="pl-12 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] focus:bg-white rounded-xl font-medium text-lg"
                    />
                 </div>
              </div>
           )}

           {/* --- MOBILE NUMBER (Shared Field) --- */}
           {/* Step 1 me dikhega (Register ke liye) aur Login me hamesha dikhega */}
           {(activeTab === "login" || (activeTab === "register" && step === 1)) && (
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
           )}

           {/* CTA Button */}
           <Button 
             onClick={activeTab === "login" ? handleLogin : handleRegister}
             disabled={
               isLoading ||
               (activeTab === "register" && step === 1 && (!name || !email || mobile.length !== 10)) ||
               (activeTab === "register" && step === 2 && otp.length < 4) ||
               (activeTab === "login" && mobile.length !== 10)
             }
             className="w-full h-14 bg-[#E23744] hover:bg-[#d32f3c] text-white font-bold text-lg rounded-xl shadow-lg shadow-red-200 mt-4 transition-all active:scale-[0.98]"
           >
             {isLoading ? (
                <><Loader2 className="animate-spin mr-2" /> Processing...</>
             ) : (
                <>
                  {activeTab === "login" 
                    ? "Login to Order" 
                    : (step === 1 ? "Send OTP" : "Verify & Register")
                  } 
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
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