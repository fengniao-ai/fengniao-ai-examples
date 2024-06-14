from flask import Flask, request, jsonify
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.padding import PKCS7

from base64 import b64decode
import hashlib
import json

app = Flask(__name__)

# Configuration for AES
AES_KEY = b'oFcTbSzdmOzXF2DZ72h9ILdLsXTE8qK1'
IV = b'IVa7b9f8d6e54gha'

def decrypt_payload(encrypted_data):
    backend = default_backend()
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(IV), backend=backend)
    decryptor = cipher.decryptor()
    decrypted_padded_data = decryptor.update(b64decode(encrypted_data)) + decryptor.finalize()
    
    # Handle PKCS7 padding
    unpadder = PKCS7(algorithms.AES.block_size).unpadder()
    decrypted_data = unpadder.update(decrypted_padded_data) + unpadder.finalize()
    return decrypted_data.decode('utf-8')

def verify_signature(payload, signature, timestamp, project_id):
    message = f"{project_id}{AES_KEY.decode()}{timestamp}{payload}"
    calculated_hash = hashlib.sha256(message.encode()).hexdigest()
    return calculated_hash == signature

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.get_json()
    try:
        print('Received webhook:', data)
        if not verify_signature(data['payload'], data['signature'], data['timestamp'], data['project_id']):
            print('Invalid signature')
            return jsonify({"error": "Invalid signature"}), 403
        
        decrypted_message = decrypt_payload(data['payload'])
        print('Decrypted payload:', decrypted_message)
        
        return jsonify({"message": "ok"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000)
