package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
)

// Constants for AES decryption
const (
	AESKey = "oFcTbSzdmOzXF2DZ72h9ILdLsXTE8qK1"
	IV     = "IVa7b9f8d6e54gha"
)

// DecryptPayload function to decrypt the payload
func DecryptPayload(encryptedData string) (string, error) {
	ciphertext, _ := base64.StdEncoding.DecodeString(encryptedData)
	block, err := aes.NewCipher([]byte(AESKey))
	if err != nil {
		return "", err
	}
	if len(ciphertext) < aes.BlockSize {
		return "", fmt.Errorf("ciphertext too short")
	}
	if len(ciphertext)%aes.BlockSize != 0 {
		return "", fmt.Errorf("ciphertext is not a multiple of the block size")
	}

	mode := cipher.NewCBCDecrypter(block, []byte(IV))
	mode.CryptBlocks(ciphertext, ciphertext)

	// PKCS7 Unpadding
	pad := ciphertext[len(ciphertext)-1]
	if int(pad) > len(ciphertext) {
		return "", fmt.Errorf("padding size error")
	}
	unpadLen := len(ciphertext) - int(pad)
	return string(ciphertext[:unpadLen]), nil
}

func verifySignature(payload, receivedSignature, projectId, timestamp string) bool {
	dataToHash := projectId + AESKey + timestamp + payload
	fmt.Println("Data to hash:", dataToHash)
	hash := sha256.Sum256([]byte(dataToHash))
	computedSignature := hex.EncodeToString(hash[:])
	return computedSignature == receivedSignature
}

// WebhookHandler handles incoming webhook requests
func WebhookHandler(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var data map[string]interface{}
	err = json.Unmarshal(body, &data)
	if err != nil {
		http.Error(w, "Error parsing JSON", http.StatusBadRequest)
		return
	}

	fmt.Println("Received webhook:", data)
	decryptedMessage, err := DecryptPayload(data["payload"].(string))
	if err != nil {
		http.Error(w, "Failed to decrypt payload: "+err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Println("Decrypted payload:", decryptedMessage)

	timestampFloat, _ := data["timestamp"].(float64)
	timestamp := int(timestampFloat)
	timestampStr := strconv.Itoa(timestamp)
	if !verifySignature(decryptedMessage, data["signature"].(string), data["project_id"].(string), timestampStr) {
		fmt.Println("Invalid signature")
		http.Error(w, "Invalid signature", http.StatusForbidden)
		return
	}
	// Add your signature verification logic here

	fmt.Fprintf(w, "ok")
}

func main() {
	http.HandleFunc("/webhook", WebhookHandler)
	log.Fatal(http.ListenAndServe(":3000", nil))
}
