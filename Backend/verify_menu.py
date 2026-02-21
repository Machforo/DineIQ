
import os
import json
from agents.menu import MenuAgent

def verify():
    ma = MenuAgent()
    result = ma.get_smart_menu()
    sections = result.get('menu_sections', {})
    
    print("\n=== Menu Verification ===\n")
    for sec, items in list(sections.items()):
        if items:
            item = items[0]
            print(f"Section: {sec}")
            print(f"  Item: {item.get('name')}")
            print(f"  Is_Veg: {item.get('Is_Veg')}")
            print(f"  isVeg: {item.get('isVeg')}")
            print(f"  Image: {item.get('image')[:40]}...")
            print(f"  Description: {item.get('description')}")
            print("-" * 30)

if __name__ == "__main__":
    verify()
