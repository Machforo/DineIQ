import math
import pandas as pd

def clean_nan(obj):
    """
    Recursively replaces NaN values with None in dictionaries and lists.
    Also handles Pandas DataFrames by converting them to cleaned records.
    
    This ensures that JSON responses do not contain invalid 'NaN' values,
    replacing them with 'null' (None) instead.
    """
    if isinstance(obj, pd.DataFrame):
        # Convert NaN to None (null) and return as list of dicts
        return obj.where(pd.notnull(obj), None).to_dict("records")
    
    if isinstance(obj, list):
        return [clean_nan(i) for i in obj]
    
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    
    if isinstance(obj, float) and math.isnan(obj):
        return None
        
    return obj
