# db - folder under project directory
# sheets_client - python file in db folder
# SheetClient - class in sheets_client.py
# get_recommendations - class method in SheetClient class
from db.sheets_client import SheetsClient

# RecommendationAgent - class in recommendation_agent.py
# get_recommendations - class method in RecommendationAgent class
class RecommendationAgent:
    def _init_(self):
        self.sheets = SheetsClient()

    def get_recommendations(self, customer_id: str):
        """Return personalized recommendations"""
        # TODO: Implement logic
        return []