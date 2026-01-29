# DineIQ\Backend\agents\recommendation.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
from dotenv import load_dotenv

from services.sheets import SheetsClient

# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------
# Class definition for Recommendation related interactions
# ---------------------------------------------------------
class RecommendationAgent:
    def __init__(self):
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID")
        self.recommendation_sheet_name = "Recommendations"      # <-- sheet name can be adapted here

        if not self.spreadsheet_id:
            raise ValueError("SPREADSHEET_ID is not set in environment variables")

        self.sheets_client = SheetsClient(
            spreadsheet_id=self.spreadsheet_id
        )

    # -------------------------------------------------------------------
    # ⭐ Public API
    # -------------------------------------------------------------------
    def get_recommendations(self, customer_id: str | None = None) -> list[dict]:
        """
        Fetch recommendations.
        Can later be personalized using customer_id.
        """

        # Placeholder for future logic
        # For now, just return an empty list

        return []