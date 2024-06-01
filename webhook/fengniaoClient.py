import argparse
import json
import sys
import os
import time
import hashlib
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import requests
os.environ['NO_PROXY'] = '127.0.0.1'

def read_args():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--project_id', type=str, help='fengniao.ai\'s Project ID')
    parser.add_argument('--api_key', type=str, help='fengniao.ai\'s API_Key')
    parser.add_argument('--webhook_url', type=str, help='Webhook URL')
    parser.add_argument('--payload', type=str, help='Path to the payload JSON file')

    # Parse the arguments
    args = parser.parse_args()
    #print(args.project_id)

    return args.project_id, args.api_key, args.webhook_url, args.payload

def read_and_validate_json(filepath):
    try:
        with open(filepath, 'r') as file:
            payload_str = file.read()  # Read the file content as a raw string

        # Try parsing the string as JSON to check if it is a valid JSON format
        json_data = json.loads(payload_str)  # This will succeed if payload_str is a valid JSON string
        #print("JSON is valid.")
        return payload_str  # Return the raw string if it is valid JSON
    except json.JSONDecodeError:
        print(f"Invalid {filepath} JSON format.")
        exit(-1)
    except FileNotFoundError:
        print(f"File {filepath} not found.")
        exit(-1)


def encrypt_payload(payload, api_key):
    iv = b'aabbccdd11223344'  # Ensure this is exactly 16 bytes
    cipher = AES.new(api_key.encode('utf-8'), AES.MODE_CBC, iv)
    # Check if payload is already in byte form or needs encoding
    if isinstance(payload, str):
        payload_bytes = payload.encode('utf-8')  # Encode string to bytes
    elif isinstance(payload, bytes):
        payload_bytes = payload  # Use byte payload directly
    else:
        raise TypeError("Payload must be a string or bytes")
    
    encrypted_payload = cipher.encrypt(pad(payload_bytes, AES.block_size))
    return encrypted_payload, iv

def generate_signature(project_id, api_key, timestamp, payload):
    message = f"{project_id}{api_key}{timestamp}{payload}"
    return hashlib.sha256(message.encode('utf-8')).hexdigest()

def send_post_request(webhook_url, project_id, timestamp, signature, encrypted_payload, iv):
    
    try:
      headers = {'Content-Type': 'application/json'}
      data = {
          'project_id': project_id,
          'timestamp': timestamp,
          'signature': signature,
          'payload': base64.b64encode(encrypted_payload).decode('utf-8')
      }
      print('\nPost data', data)
      response = requests.post(webhook_url, headers=headers, json=data)
      return response
    except requests.exceptions.HTTPError as http_err:
        print(f'HTTP error occurred: {http_err}')  # Specific HTTP error
    except requests.exceptions.ConnectionError as conn_err:
        print(f'Connection error occurred: {conn_err}')  # Problems with the network connection
    except requests.exceptions.Timeout as timeout_err:
        print(f'Timeout error occurred: {timeout_err}')  # Request timed out
    except requests.exceptions.RequestException as req_err:
        print(f'Error during request: {req_err}')  # Catch-all for request-related errors
    return None  # Return None if an error occurred

def main():
    project_id, api_key, webhook_url, payload_file = read_args()
    payload = read_and_validate_json(payload_file)
    
    encrypted_payload, iv = encrypt_payload(payload, api_key)
    timestamp = int(time.time())
    signature = generate_signature(project_id, api_key, timestamp, payload)
    response = send_post_request(webhook_url, project_id, timestamp, signature, encrypted_payload, iv)
    if (response is None):
        print(f"Failed to send request to {webhook_url}")
        exit(-1)
    else:
      print(f"Response from server: {response.status_code} - {response.text}")

if __name__ == "__main__":
    main()