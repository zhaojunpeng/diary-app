#!/usr/bin/env python3
"""
Deploy diary app to Tencent Cloud COS (static website)
Reads credentials from ~/.tencentcloud/credentials
"""
import sys
import time
from pathlib import Path

try:
    from qcloud_cos import CosConfig, CosS3Client
except ImportError:
    print("❌ COS SDK not found. Install with: pip3 install cos-python-sdk-v5")
    sys.exit(1)

CRED_FILE = Path.home() / ".tencentcloud" / "credentials"

def read_credentials():
    if not CRED_FILE.exists():
        print(f"❌ Credentials file not found: {CRED_FILE}")
        sys.exit(1)
    
    config = {}
    current_section = None
    with open(CRED_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith('[') and line.endswith(']'):
                current_section = line[1:-1]
                continue
            if '=' in line and current_section:
                key, _, value = line.partition('=')
                config[f"{current_section}.{key.strip()}"] = value.strip()
    
    secret_id = config.get('default.secret_id', '')
    secret_key = config.get('default.secret_key', '')
    
    if not secret_id or not secret_key:
        print("❌ secret_id or secret_key not found in credentials file")
        sys.exit(1)
    
    return secret_id, secret_key

BUCKET = "diary-1306051574"
REGION = "ap-beijing"
SOURCE_DIR = Path(__file__).parent

def main():
    print("🚀 Uploading diary app to COS...")
    
    secret_id, secret_key = read_credentials()
    
    config = CosConfig(
        Region=REGION,
        SecretId=secret_id,
        SecretKey=secret_key,
        Scheme='https'
    )
    client = CosS3Client(config)
    
    # Ensure static website hosting is enabled
    print("\n🌐 Ensuring static website hosting is enabled...")
    try:
        client.put_bucket_website(
            Bucket=BUCKET,
            WebsiteConfiguration={
                'IndexDocument': {'Suffix': 'diary.html'},
                'ErrorDocument': {'Key': 'diary.html'}
            }
        )
        print("   ✅ Website hosting configured (index: diary.html)")
    except Exception as e:
        print(f"   ⚠️  Warning configuring website: {e}")
    
    # Files to upload with correct content types
    upload_files = [
        ("diary.html", "text/html; charset=utf-8"),
        ("styles.css", "text/css; charset=utf-8"),
    ]
    
    js_files = list(SOURCE_DIR.glob("js/*.js"))
    for js_file in sorted(js_files):
        upload_files.append((str(js_file.relative_to(SOURCE_DIR)), "application/javascript; charset=utf-8"))
    
    uploaded = 0
    for file_path, content_type in upload_files:
        full_path = SOURCE_DIR / file_path
        if not full_path.exists():
            print(f"   ⚠️  Skipping {file_path} (not found)")
            continue
        
        try:
            with open(full_path, 'rb') as f:
                body = f.read()
            
            response = client.put_object(
                Bucket=BUCKET,
                Body=body,
                Key=file_path,
                ContentType=content_type,
                CacheControl='no-cache'
            )
            print(f"   ✅ Uploaded: {file_path} ({len(body)} bytes)")
            uploaded += 1
        except Exception as e:
            print(f"   ❌ Failed to upload {file_path}: {e}")
    
    if uploaded == 0:
        print("\n❌ No files uploaded!")
        return
    
    # Verify metadata
    print(f"\n🔍 Verifying metadata ({uploaded} files uploaded)...")
    time.sleep(2)
    
    all_ok = True
    for file_path, expected_type in upload_files:
        try:
            head_resp = client.head_object(Bucket=BUCKET, Key=file_path)
            actual_type = head_resp.get('Content-Type', '')
            cd = head_resp.get('Content-Disposition', '(none)')
            
            status = "✅" if expected_type in actual_type else "❌"
            if status == "❌":
                all_ok = False
            
            print(f"   {status} {file_path}: {actual_type} | CD: {cd}")
        except Exception as e:
            print(f"   ❌ {file_path}: Error - {e}")
            all_ok = False
    
    print(f"\n{'='*50}")
    print(f"✅ Upload complete! {uploaded} files uploaded.")
    print(f"\n🌍 Access URLs:")
    print(f"   Website:  https://{BUCKET}.cos-website.{REGION}.myqcloud.com/")
    print(f"   Direct:   https://{BUCKET}.cos.{REGION}.myqcloud.com/diary.html")
    print(f"\n💡 Update command:")
    print(f"   python3 {Path(__file__).name}")

if __name__ == "__main__":
    main()
