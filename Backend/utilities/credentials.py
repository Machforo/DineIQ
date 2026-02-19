"""
Helper utility to decode Base64 JSON credentials from environment variables.
This is used when deploying to Render with Base64-encoded JSON files.
"""

import os
import base64
import json
from pathlib import Path


def decode_json_from_base64(env_var_name: str, output_filename: str) -> str:
    """
    Decode a Base64-encoded JSON from environment variable and save to file.
    
    Args:
        env_var_name: Name of the environment variable containing Base64 JSON
        output_filename: Name of the file to save the decoded JSON
        
    Returns:
        Path to the created file
    """
    base64_json = os.getenv(env_var_name)
    
    if not base64_json:
        # Avoid raising error if env var is missing, just skip (or raise if critical)
        # Based on user code: raise ValueError
        # But wait, locally we might not have it. 
        # The user's code raises ValueError. Let's stick to user's code.
        raise ValueError(f"Environment variable {env_var_name} not found!")
    
    # Decode Base64 to JSON
    json_bytes = base64.b64decode(base64_json)
    json_str = json_bytes.decode('utf-8')
    
    # Validate JSON
    json.loads(json_str)  # This will raise an error if invalid
    
    # Write to file
    output_path = Path(output_filename)
    output_path.write_text(json_str)
    
    print(f"✅ Decoded {env_var_name} to {output_filename}")
    return str(output_path)


def setup_credentials():
    """
    Setup credentials from Base64 environment variables.
    Call this function at application startup if using Base64 encoding.
    """
    try:
        # Decode service account JSON
        if os.getenv("SERVICE_ACCOUNT_JSON_BASE64"):
            decode_json_from_base64(
                "SERVICE_ACCOUNT_JSON_BASE64",
                "dineIQ_service_account.json"
            )
        
        # Decode Gmail OAuth JSON
        if os.getenv("GMAIL_OAUTH_JSON_BASE64"):
            decode_json_from_base64(
                "GMAIL_OAUTH_JSON_BASE64",
                "dineIQ_gmail_OAuth_Credentials.json"
            )
        
        print("✅ Credentials setup checked (Base64 decoding if applicable)")
        
    except Exception as e:
        print(f"❌ Error decoding credentials: {e}")
        # raise # Optional: raise if critical
        pass # Don't crash local dev if just checking


if __name__ == "__main__":
    # Test the function
    setup_credentials()
