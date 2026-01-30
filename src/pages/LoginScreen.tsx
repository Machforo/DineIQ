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
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbziwt_310-tDnkzPTpgbgW89M6jxjDXQVbRIn7k-JzBiezCzoDcjhPjDDbZDjVrLf4N5w/exec";

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("phone");
  const [step, setStep] = useState<1 | 2>(1);

  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. LOGIN LOGIC UPDATED ---
  const handleLogin = async () => {
    if (loginMethod === "email" && !email.includes("@")) {
      toast.error("Please enter a valid Email Address");
      return;
    }
    if (loginMethod === "phone" && mobile.length !== 10) {
      toast.error("Please enter a valid 10-digit Mobile Number");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          // Backend pe check_user_login action hona chahiye
          action: "check_user", 
          method: loginMethod,
          value: loginMethod === "email" ? email : mobile,
        }),
      });

      const data = await response.json();

      if (data.status === "exists") {
        if (loginMethod === "email") {
          // Email hone par OTP step 2 pe bhej rahe hain
          toast.success("User found! OTP sent to your email.");
          setStep(2); 
        } else {
          // Mobile number hone par direct login
          toast.success(`Welcome back, ${data.name}!`);
          login(data.name, +mobile);
          navigate("/home");
        }
      } else {
        toast.error("Account not found. Please Sign Up first.");
        setActiveTab("register");
      }
    } catch (error) {
      toast.error("Connection failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. LOGIN OTP VERIFY FUNCTION (NAYA) ---
  const handleLoginOTPVerify = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "verify_otp", email, otp }),
      });
      const data = await response.json();
      if (data.status === "ok") {
        toast.success("Login Successful!");
        login(email, +mobile); 
        navigate("/home");
      } else {
        toast.error("Invalid OTP");
      }
    } catch (error) {
      toast.error("Error occurred. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      if (step === 1) {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "send_otp", name, mobile, email }),
        });
        toast.success(`OTP sent to ${email}`);
        setStep(2);
      } else {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "verify_otp", email, otp }),
        });
        const data = await response.json();
        if (data.status === "ok") {
          toast.success("Registration Successful!");
          login(name, +mobile);
          // Email ko state mein pass karein taki Preference page use save kar sake
          navigate("/preferences", { state: { email: email } });
        } else {
          toast.error("Invalid OTP");
        }
      }
    } catch (error) {
      toast.error("Error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative font-sans">
      <div className="h-[35vh] relative w-full overflow-hidden">
        <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute bottom-8 left-6 right-6 text-white animate-fade-in">
          <h1 className="text-4xl font-black tracking-tighter mb-1">DineIQ <span className="text-[#E23744]">Kitchen</span></h1>
          <p className="text-gray-300 text-sm font-medium">India's #1 Table Ordering App</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[30px] -mt-6 relative z-10 px-6 pt-8 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-slide-up">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />

        <div className="flex bg-gray-50 p-1.5 rounded-xl mb-6 border border-gray-100">
          <button onClick={() => {setActiveTab("login"); setStep(1);}} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Log in</button>
          <button onClick={() => {setActiveTab("register"); setStep(1);}} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Sign up</button>
        </div>

        <div className="space-y-5">
          <div className="mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTab === "login" 
                ? (step === 1 ? "Welcome Back!" : "Enter Login OTP") 
                : (step === 1 ? "Create Account" : "Enter OTP")}
            </h2>
          </div>

          {/* --- LOGIN SECTION --- */}
          {activeTab === "login" && (
            <div className="space-y-5 animate-fade-in">
              {step === 1 ? (
                <>
                  <div className="flex gap-4 border-b border-gray-100 pb-2">
                    <button onClick={() => setLoginMethod("phone")} className={`text-sm font-bold transition-all pb-1 ${loginMethod === "phone" ? "text-[#E23744] border-b-2 border-[#E23744]" : "text-gray-400"}`}>Phone</button>
                    <button onClick={() => setLoginMethod("email")} className={`text-sm font-bold transition-all pb-1 ${loginMethod === "email" ? "text-[#E23744] border-b-2 border-[#E23744]" : "text-gray-400"}`}>Email</button>
                  </div>

                  {loginMethod === "phone" ? (
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
                        <span className="font-bold text-gray-900">+91</span>
                      </div>
                      <Input type="tel" maxLength={10} placeholder="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} className="pl-24 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] rounded-xl font-bold text-lg" />
                    </div>
                  ) : (
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <Input placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12 h-14 bg-gray-50 border-gray-200 focus:border-[#E23744] rounded-xl font-medium text-lg" />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <Input placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="h-14 bg-gray-50 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-widest" />
                  <button onClick={() => setStep(1)} className="text-sm text-gray-500 underline">Change Email</button>
                </div>
              )}
            </div>
          )}

          {/* --- REGISTER SECTION --- */}
          {activeTab === "register" && (
            <div className="space-y-4">
              {step === 1 ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="pl-12 h-14 bg-gray-50 border-gray-200 rounded-xl" />
                  </div>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12 h-14 bg-gray-50 border-gray-200 rounded-xl" />
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold">+91</div>
                    <Input type="tel" maxLength={10} placeholder="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} className="pl-16 h-14 bg-gray-50 border-gray-200 rounded-xl" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <Input placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="h-14 bg-gray-50 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-widest" />
                  <button onClick={() => setStep(1)} className="text-sm text-gray-500 underline">Change Details</button>
                </div>
              )}
            </div>
          )}

          {/* --- UPDATED BUTTON LOGIC --- */}
          <Button 
            onClick={() => {
              if (activeTab === "login") {
                step === 1 ? handleLogin() : handleLoginOTPVerify();
              } else {
                handleRegister();
              }
            }}
            disabled={isLoading}
            className="w-full h-14 bg-[#E23744] hover:bg-[#d32f3c] text-white font-bold text-lg rounded-xl shadow-lg mt-2 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : (
              activeTab === "login" 
                ? (step === 1 ? "Login to Order" : "Verify & Login")
                : (step === 1 ? "Send OTP" : "Verify & Register")
            )}
            {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>

          <p className="text-center text-[11px] text-gray-400 mt-4 leading-relaxed">
            By continuing, you agree to our <br/>
            <span className="text-gray-600 font-semibold underline">Terms of Service</span> & <span className="text-gray-600 font-semibold underline">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}