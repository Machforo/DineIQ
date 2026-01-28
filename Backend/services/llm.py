# DineIQ\Backend\services\llm.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import time
import google.generativeai as genai

# ---------------------------------------------------------
# Load environment variables from .env file
# ---------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

# ---------------------------------------------------------
# Class definition for Google Sheets interactions
# ---------------------------------------------------------
class LLMClient:

    # -------------------------------------------------------------------
    # 🔧 SETUP: Google Gemini
    # https://aistudio.google.com/api-keys
    # Created a new API key for DineIQ project 'DineIQ_Gemini_API_Key'
    # API key is configured in .env file as GEMINI_API_KEY
    # Model configured in .env file as GEMINI_MODEL
    # -------------------------------------------------------------------
    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
    ):
        """
        :param api_key: Gemini API key (defaults to GEMINI_API_KEY env var)
        :param model_name: Gemini model name (defaults to GEMINI_MODEL env var)
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = model_name or os.getenv("GEMINI_MODEL")

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY missing")

        if not self.model_name:
            raise ValueError("GEMINI_MODEL missing")

        self._model = self.init_gemini()

    # -------------------------------------------------------------------
    # 🔧 Init
    # -------------------------------------------------------------------
    def init_gemini(self):
        genai.configure(api_key=self.api_key)
        return genai.GenerativeModel(self.model_name)

    # -------------------------------------------------------------------
    # 🧠 LLM Call with retry
    # -------------------------------------------------------------------
    def call_gemini_with_retry(
        self,
        prompt: str,
        max_retries: int = 3,
        rate_limit_sleep: int = 60,
        error_sleep: int = 5,
    ) -> str | None:
        """
        Call Gemini with basic retry & backoff handling.

        :param prompt: Prompt to send to Gemini
        :param max_retries: Number of retry attempts
        :param rate_limit_sleep: Seconds to wait on 429 errors
        :param error_sleep: Seconds to wait on other errors
        :return: Generated text or None
        """
        for attempt in range(1, max_retries + 1):
            try:
                response = self._model.generate_content(prompt)

                if response and getattr(response, "text", None):
                    return response.text

            except Exception as e:
                print(f"⚠️ Gemini call failed (attempt {attempt}): {e}")

                if "429" in str(e):
                    print(f"⏳ Rate limit hit. Waiting {rate_limit_sleep}s...")
                    time.sleep(rate_limit_sleep)
                else:
                    time.sleep(error_sleep)

        return None

    # -------------------------------------------------------------------
    # 🧠 LLM Call with no retry
    # -------------------------------------------------------------------
    def call_gemini(
        self,
        prompt: str,
    ) -> str | None:
        """
        Call Gemini once without any retry or backoff logic.

        :param prompt: Prompt to send to Gemini
        :return: Generated text or None
        """
        try:
            response = self._model.generate_content(prompt)

            if response and getattr(response, "text", None):
                return response.text

        except Exception as e:
            print(f"⚠️ Gemini call failed: {e}")

        return None
