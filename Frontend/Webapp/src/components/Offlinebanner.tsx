import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000); // Hide after 3s
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fully online and no toast to show
  if (isOnline && !showBackOnline) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center justify-center gap-2 px-4 py-2 rounded-full shadow-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-500 ${
        isOnline
          ? "bg-green-600/90 text-white backdrop-blur-sm"
          : "bg-gray-900/90 text-white backdrop-blur-sm border border-gray-700"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          You're back online!
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 animate-pulse" />
          You're offline — Showing cached menu
        </>
      )}
    </div>
  );
}