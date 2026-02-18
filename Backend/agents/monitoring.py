# DineIQ\Backend\agents\monitoring.py

# ------------------------------------------------------------------------------------------------------------------
# monitoring agent is supposed to track user activities on Menu Screen of a web application.

# Below is a comprehensive list of possible activities that a customer might perform on the Menu Screen:
# - View Menu
# - Apply filters to menu items
# - Search Items
# - Add/Remove items to cart
# - Update item quantity in cart
# - View/Apply Combos
# - View/Apply Discounts/Offers
# - View/Apply Coupons
# - View/Apply Repeat Orders
# - Proceed to Checkout
# - View Order History
# - Reorder from History
# ------------------------------------------------------------------------------------------------------------------

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
# import os
# from dotenv import load_dotenv

# from services.sheets import SheetsClient

# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------
# load_dotenv()

# ---------------------------------------------------------
# Class definition for Menu related interactions
# ---------------------------------------------------------
class MonitoringAgent:
    def __init__(self):
        self.activities = []

    def log_activity(self, user, activity):
        # self.activities.append((user, activity))
        self.activities.append({"user": user, "activity": activity})
        print(f"Activity Logged for {user}: {activity}")

    def view_menu(self, user):
        self.log_activity(user, "View Menu")

    def apply_filters(self, filters):
        self.log_activity(f"Apply filters: {filters}")

    def search_items(self, query):
        self.log_activity(f"Search Items: {query}")

    def add_to_cart(self, item):
        self.log_activity(f"Add to cart: {item}")

    def remove_from_cart(self, item):
        self.log_activity(f"Remove from cart: {item}")

    def update_item_quantity(self, item, quantity):
        self.log_activity(f"Update item quantity: {item} to {quantity}")

    def view_combos(self):
        self.log_activity("View Combos")

    def apply_combo(self, combo):
        self.log_activity(f"Apply Combo: {combo}")

    def view_discounts(self):
        self.log_activity("View Discounts/Offers")

    def apply_discount(self, discount):
        self.log_activity(f"Apply Discount/Offer: {discount}")

    def view_coupons(self):
        self.log_activity("View Coupons")

    def apply_coupon(self, coupon):
        self.log_activity(f"Apply Coupon: {coupon}")

    def view_repeat_orders(self):
        self.log_activity("View Repeat Orders")
    
    def apply_repeat_orders(self, order):
        self.log_activity(f"Apply Repeat Order: {order}")

    def proceed_to_checkout(self):
        self.log_activity("Proceed to Checkout")

    def view_order_history(self):
        self.log_activity("View Order History")

    def reorder_from_history(self, order_id):
        self.log_activity(f"Reorder from History: Order ID {order_id}")

# Example usage
# if __name__ == "__main__":
#     monitor = MenuScreenActivityMonitor()
#     monitor.view_menu()
#     monitor.apply_filters({"category": "Beverages", "price_range": "10-50"})
#     monitor.search_items("Pizza")
#     monitor.add_to_cart("Margherita Pizza")
#     monitor.update_item_quantity("Margherita Pizza", 2)
#     monitor.view_combos()
#     monitor.apply_combo("Family Combo")
#     monitor.view_discounts()
#     monitor.apply_discount("10% OFF")
#     monitor.view_coupons()
#     monitor.apply_coupon("WELCOME10")
#     monitor.view_repeat_orders()
#     monitor.proceed_to_checkout()
#     monitor.view_order_history()
#     monitor.reorder_from_history(12345)


# Extract: items viewed/added/removed/ordered/filtered etc for each customer as a first level logging
# Extract/Filter all relevant information to profile a customer and save the final information log





