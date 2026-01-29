// src/utils/logger.ts

export const saveLog = async (email: string, action: string, details: string = "") => {
  // Aapka vahi SCRIPT_URL jo PreferenceScreen mein use kiya hai
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbziwt_310-tDnkzPTpgbgW89M6jxjDXQVbRIn7k-JzBiezCzoDcjhPjDDbZDjVrLf4N5w/exec";

  try {
    const logData = {
      action: "save_app_log",
      email: email || "anonymous", // Agar email na ho toh anonymous save karega
      activity: action,
      details: details,
    };

    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script ke liye zaruri hai agar direct fetch kar rahe ho
      body: JSON.stringify(logData),
    });

    console.log(`Log Recorded: ${action}`);
  } catch (error) {
    console.error("Failed to save log:", error);
  }
};