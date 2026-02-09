import qrcode
import os

# 1. Folder banayein jahan images save hongi
if not os.path.exists("table_qrs"):
    os.makedirs("table_qrs")

# 2. Aapka Updated Base URL (Port 8080 ke saath)
BASE_URL = "http://10.122.228.81:8080" 

print(f"Generating QR Codes for: {BASE_URL}...\n")

for i in range(1, 11):
    # URL structure: base_url + ?table=number
    data = f"{BASE_URL}/?table={i}"
    
    # QR Code Configuration
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H, 
        box_size=10,
        border=4,
    )
    
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save Image
    filename = f"table_qrs/Table_{i}.png"
    img.save(filename)
    print(f"✅ Generated: {filename} -> Points to: {data}")

print("\n🎉 All 10 QR Codes generated in 'table_qrs' folder!")