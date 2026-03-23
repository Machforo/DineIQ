import pandas as pd
import datetime

class DbCompat:
    def __init__(self, sqlite_db):
        self.sqlite_db = sqlite_db

    def read_sheet(self, sheet_name: str) -> pd.DataFrame:
        if sheet_name == "Menu":
            rows = self.sqlite_db.fetch_all("SELECT * FROM menu")
            return pd.DataFrame([{
                "Item_ID": r["item_id"],
                "Item_Name": r["name"],
                "Item_Category": r["category"],
                "Base_Price": r["base_price"],
                "Low_Cap_Price": r["low_cap_price"],
                "High_Cap_Price": r["high_cap_price"],
                "Current_Price": r["current_price"],
                "Item_Description": r["description"],
                "Description": r["description"],
                "Is_Active": "ACTIVE" if r["is_active"] else "INACTIVE",
                # Note: schema.sql has no is_veg column, so it is strictly excluded.
            } for r in rows])
            
        elif sheet_name == "Orders":
            rows = self.sqlite_db.fetch_all("SELECT * FROM orders")
            return pd.DataFrame([{
                "Order_ID": r["order_id"],
                "Customer_ID": r["customer_id"],
                "Order_Price": r["order_price"],
                "Order_Created_DateTime": r["created_at"],
                "Order_Status": r["status"],
                "Table_Number": r["table_number"]
            } for r in rows])
            
        elif sheet_name == "Order_Items":
            rows = self.sqlite_db.fetch_all("""
                SELECT oi.*, m.name 
                FROM order_items oi 
                LEFT JOIN menu m ON oi.item_id = m.item_id
            """)
            return pd.DataFrame([{
                "Order_Item_ID": r["order_item_id"],
                "Order_ID": r["order_id"],
                "Item_ID": r["item_id"],
                "Item_Name": dict(r).get("name", "Unknown"),
                "Quantity": r["quantity"],
                "Price": r["price"]
            } for r in rows])
            
        elif sheet_name == "Customer_Insights":
            rows = self.sqlite_db.fetch_all("""
                SELECT ci.*, c.name as customer_name 
                FROM customer_insights ci 
                LEFT JOIN customers c ON ci.customer_id = c.customer_id
            """)
            return pd.DataFrame([{
                "Customer_ID": r["customer_id"],
                "Customer_Name": dict(r).get("customer_name", ""),
                "Dietary": r["dietary"],
                "Favorites": r["favorites"],
                "AOV": r["aov"],
                "Frequency": r["frequency"],
                "Attitude": r["attitude"],
                "Customer_Score": r["customer_score"]
            } for r in rows])
            
        elif sheet_name == "Customer_Auth":
            rows = self.sqlite_db.fetch_all("SELECT * FROM customers")
            return pd.DataFrame([{
                "Customer_ID": r["customer_id"],
                "Customer_Name": r["name"],
                "Customer_Email": r["email"],
                "Customer_Phone": r["phone"],
                "Date_of_Birth": r["date_of_birth"],
                "Customer_Category": r["customer_category"],
                "Table_Number": r["table_number"],
                "Creation_DateTime": r["created_at"],
                "Last_Login_DateTime": r["last_login"]
            } for r in rows])
            
        elif sheet_name == "Customer_Preferences":
            rows = self.sqlite_db.fetch_all("""
                SELECT cp.*, c.name as customer_name, c.email as customer_email 
                FROM customer_preferences cp 
                LEFT JOIN customers c ON cp.customer_id = c.customer_id
            """)
            return pd.DataFrame([{
                "Customer_ID": r["customer_id"],
                "Customer_Name": dict(r).get("customer_name", ""),
                "Customer_Email": dict(r).get("customer_email", ""),
                "Dietary_Type": r["dietary_type"],
                "Preferred_Soup": r["preferred_soup"],
                "Favorite_Bun": r["favorite_bun"],
                "Dessert_Preference": r["dessert_preference"],
                "Creation_DateTime": r["updated_at"]
            } for r in rows])
            
        elif sheet_name == "Chats":
            rows = self.sqlite_db.fetch_all("""
                SELECT ch.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email 
                FROM chats ch 
                LEFT JOIN customers c ON ch.customer_id = c.customer_id
            """)
            return pd.DataFrame([{
                "Chat_ID": r["chat_id"],
                "Customer_ID": r["customer_id"],
                "Customer_Name": dict(r).get("customer_name", ""),
                "Customer_Phone": dict(r).get("customer_phone", ""),
                "Customer_Email": dict(r).get("customer_email", ""),
                "Chat_DateTime": r["chat_datetime"],
                "Chat_Session_Text": r["session_text"]
            } for r in rows])

        elif sheet_name == "Customer_Reviews":
            rows = self.sqlite_db.fetch_all("""
                SELECT r.*, c.name, c.email 
                FROM reviews r 
                LEFT JOIN customers c ON r.customer_id = c.customer_id
            """)
            return pd.DataFrame([{
                "Review_ID": r["review_id"],
                "Customer_ID": r["customer_id"],
                "Customer_Name": dict(r).get("name", ""),
                "Customer_Email": dict(r).get("email", ""),
                "Review_Date_Time": r["review_datetime"],
                "Food_Quality": r["food_quality"],
                "Service": r["service"],
                "Cleanliness": r["cleanliness"],
                "Value_For_Money": r["value_for_money"],
                "Overall_Experience": r["overall_experience"],
                "Additional_Comments": r["comments"],
                "Review_Type": r["review_type"],
                "Urgency": r["urgency"],
                "Assigned_To": r["assigned_to"],
                "Actions_Needed": r["actions_needed"],
                "Internal_Comments": r["internal_comments"],
                "Status": r["status"]
            } for r in rows])
            
        else:
            return pd.DataFrame()
            
    def read_sheet_rows(self, sheet_name: str) -> list:
        return self.read_sheet(sheet_name).to_dict("records")
        
    def _update_or_insert(self, table: str, keys: dict, data: dict):
        where = " AND ".join([f"{k} = ?" for k in keys.keys()])
        row = self.sqlite_db.fetch_one(f"SELECT * FROM {table} WHERE {where}", tuple(keys.values()))
        if row:
            self.sqlite_db.update(table, data, keys)
        else:
            full_data = keys.copy()
            full_data.update(data)
            self.sqlite_db.insert(table, full_data)

    def update_sheet(self, sheet_name: str, new_df: pd.DataFrame, columns_to_update=None):
        if sheet_name == "Menu":
            for _, row in new_df.iterrows():
                is_active = 1 if str(row.get("Is_Active", "")).upper() in ["ACTIVE", "TRUE", "1", "YES"] else 0
                
                self._update_or_insert("menu", 
                    {"item_id": row["Item_ID"]},
                    {
                        "name": row["Item_Name"], 
                        "category": row.get("Item_Category", ""), 
                        "base_price": row.get("Base_Price", 0.0),
                        "low_cap_price": row.get("Low_Cap_Price", 0.0),
                        "high_cap_price": row.get("High_Cap_Price", 0.0),
                        "current_price": row.get("Current_Price", 0.0),
                        "description": row.get("Item_Description", ""), 
                        "is_active": is_active
                    })
                     
        elif sheet_name == "Customer_Insights":
            for _, row in new_df.iterrows():
                self._update_or_insert("customer_insights",
                    {"customer_id": row["Customer_ID"]},
                    {
                        "dietary": row.get("Dietary", ""),
                        "favorites": row.get("Favorites", ""), 
                        "aov": row.get("AOV", 0.0), 
                        "frequency": row.get("Frequency", 0.0), 
                        "attitude": row.get("Attitude", ""),
                        "customer_score": row.get("Customer_Score", 0.0)
                    })
                     
        elif sheet_name == "Customer_Auth":
            for _, row in new_df.iterrows():
                self._update_or_insert("customers",
                    {"customer_id": row["Customer_ID"]},
                    {"customer_category": row.get("Customer_Category", "")})

        elif sheet_name == "Customer_Reviews":
            for _, row in new_df.iterrows():
                self._update_or_insert("reviews",
                    {"review_id": row["Review_ID"]},
                    {
                        "review_datetime": row.get("Review_Date_Time", ""),
                        "food_quality": row.get("Food_Quality", 0),
                        "service": row.get("Service", 0),
                        "cleanliness": row.get("Cleanliness", 0),
                        "value_for_money": row.get("Value_For_Money", 0),
                        "overall_experience": row.get("Overall_Experience", 0),
                        "comments": row.get("Additional_Comments", ""),
                        "review_type": row.get("Review_Type", ""),
                        "urgency": row.get("Urgency", ""),
                        "assigned_to": row.get("Assigned_To", ""),
                        "actions_needed": row.get("Actions_Needed", ""),
                        "internal_comments": row.get("Internal_Comments", ""),
                        "status": row.get("Status", "")
                    })

    def append_row(self, sheet_name: str, new_row: list):
        if sheet_name == "Customer_Preferences":
             self.sqlite_db.insert("customer_preferences", {
                 "customer_id": new_row[0],
                 "dietary_type": new_row[3] if len(new_row) > 3 else "",
                 "preferred_soup": new_row[4] if len(new_row) > 4 else "",
                 "favorite_bun": new_row[5] if len(new_row) > 5 else "",
                 "dessert_preference": new_row[6] if len(new_row) > 6 else "",
                 "updated_at": new_row[7] if len(new_row) > 7 else ""
             })
        elif sheet_name == "Chats":
             self.sqlite_db.insert("chats", {
                 "chat_id": new_row[0],
                 "customer_id": new_row[1],
                 "chat_datetime": new_row[5] if len(new_row) > 5 else "",
                 "session_text": new_row[6] if len(new_row) > 6 else ""
             })
        elif sheet_name == "Customer_Activities":
             self.sqlite_db.insert("customer_activities", {
                 "customer_id": new_row[0],
                 "activities": new_row[3] if len(new_row) > 3 else "",
                 "created_at": new_row[4] if len(new_row) > 4 else ""
             })
        elif sheet_name == "Customer_Reviews":
             self.sqlite_db.insert("reviews", {
                 "review_id": new_row[0],
                 "customer_id": new_row[1] if len(new_row) > 1 else "",
                 "review_datetime": new_row[4] if len(new_row) > 4 else "",
                 "food_quality": new_row[5] if len(new_row) > 5 else 0,
                 "service": new_row[6] if len(new_row) > 6 else 0,
                 "cleanliness": new_row[7] if len(new_row) > 7 else 0,
                 "value_for_money": new_row[8] if len(new_row) > 8 else 0,
                 "overall_experience": new_row[9] if len(new_row) > 9 else 0,
                 "comments": new_row[10] if len(new_row) > 10 else "",
                 "review_type": new_row[11] if len(new_row) > 11 else "",
                 "urgency": new_row[12] if len(new_row) > 12 else "",
                 "assigned_to": new_row[13] if len(new_row) > 13 else "",
                 "actions_needed": new_row[14] if len(new_row) > 14 else "",
                 "internal_comments": new_row[15] if len(new_row) > 15 else "",
                 "status": new_row[16] if len(new_row) > 16 else ""
             })

    # invalidate cache
    def invalidate_cache(self, sheet_name: str = None):
        # Stub to replace API cache invalider when used by SQLite wrapper
        pass
