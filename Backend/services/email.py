# DineIQ\Backend\services\email.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import base64
from email.mime.text import MIMEText

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# ---------------------------------------------------------
# Load environment variables from .env file
# ---------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()


# ---------------------------------------------------------
# Class definition for Gmail interactions
# ---------------------------------------------------------
class GmailClient:

    # -------------------------------------------------------------------
    # 🔧 SETUP: Gmail API (OAuth)
    # 
    # Enabled Gmail API for 'DineIQ Project' in Google Cloud Account:
    #   DineIQ Project -> APIs & Services -> Library -> Gmail API -> Enable
    # Configure OAuth Consent Screen:
    #   DineIQ Project -> APIs & Services → OAuth consent screen -> Branding:
    #       App Name: DineIQ_App
    #       User Support Email: UmangMalhotra1980@gmail.com
    # Add Audience:
    #   DineIQ Project -> APIs & Services → OAuth consent screen -> Audience:
    #       User Type: External
    #       Test User: UmangMalhotra1980@gmail.com (gmail ID to send emails)
    # Add OAuth Client ID:
    #   DineIQ Project -> APIs & Services → OAuth consent screen -> Client:
    #       Application Type: Desktop App
    #       Name: DineIQ_Gmail_Sender
    # Add Scopes:
    #   DineIQ Project -> APIs & Services → OAuth consent screen -> Data Access:
    #       Select Scope option: https://www.googleapis.com/auth/gmail.send
    # Download JSON:
    #   Key 'dineIQ_gmail_OAuth_Credentials.json' is downloaded, move it to project folder.
    #   Added [GMAIL_OAUTH_CRENTIALS = "dineIQ_gmail_OAuth_Credentials.json"] in .env file.
    #
    # First run will open browser for consent and generate token.json
    # -------------------------------------------------------------------
    SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

    def __init__(
        self,
        client_secret_file: str | None = None,
        token_path: str | None = None,
    ):
        """
        :param client_secret_file: OAuth client secret JSON
                                   Defaults to GMAIL_OAUTH_CLIENT_SECRET env var
        :param token_path: Path to token.json
        """
        self.client_secret_file = (
            client_secret_file or os.getenv("GMAIL_OAUTH_CLIENT_SECRET")
        )

        if not self.client_secret_file:
            raise ValueError("GMAIL_OAUTH_CLIENT_SECRET is not set")

        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.token_path = token_path or os.path.join(base_dir, "token.json")

        self._service = self.init_service()

    # -------------------------------------------------------------------
    # 🔐 Init
    # -------------------------------------------------------------------
    def init_service(self):
        creds = None

        if os.path.exists(self.token_path):
            creds = Credentials.from_authorized_user_file(
                self.token_path, self.SCOPES
            )

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    print("🔄 Refreshing Gmail access token...")
                    creds.refresh(Request())
                except Exception as e:
                    print(f"⚠️ Refresh token invalid: {e}. Re-authenticating...")
                    creds = None

            if not creds:
                print("🔑 Running local server for Gmail OAuth...")
                # This will BLOCK/HANG if no browser interaction is possible
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.client_secret_file,
                    self.SCOPES,
                )
                creds = flow.run_local_server(port=0)

            with open(self.token_path, "w") as token:
                token.write(creds.to_json())

        service = build("gmail", "v1", credentials=creds)
        return service.users()
    
    # -------------------------------------------------------------------
    # Mock Service Class
    # -------------------------------------------------------------------
    class MockService:
        def messages(self):
            return self

        def send(self, userId, body):
            return self
            
        def execute(self):
            print(f">>> [MOCK EMAIL SENT] (Auth not verified)")
            return {"id": "mock_id", "labelIds": ["SENT"]}
    
    # -------------------------------------------------------------------
    # ✉️ Send Email
    # -------------------------------------------------------------------
    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
    ):
        """
        Send a plain-text email using Gmail API.
        """
        message = MIMEText(body)
        message["to"] = to_email
        message["subject"] = subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        self._service.messages().send(
            userId="me",
            body={"raw": raw},
        ).execute()

    # -------------------------------------------------------------------
    # 🔐 Send OTP (thin wrapper)
    # -------------------------------------------------------------------
    def send_otp_email(self, to_email: str, otp: str):
        self.send_email(
            to_email=to_email,
            subject="Your Login OTP",
            body=f"Your OTP is {otp}. Valid for 5 minutes.",
        )


# test hook
# if __name__ == "__main__":
#     self = GmailClient()
    
#     self.init_service()

#     self.send_otp_email(to_email="UmangHere@gmail.com", otp='123456')

    

