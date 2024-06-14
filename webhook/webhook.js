const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Replace 'aesKey' and 'iv' with your actual AES key and IV
const aesKey = Buffer.from('oFcTbSzdmOzXF2DZ72h9ILdLsXTE8qK1', 'utf-8');  // Ensure your key length matches AES-256 if using that
const iv = Buffer.from('IVa7b9f8d6e54gha', 'utf-8');  // Ensure this matches the IV length (16 bytes for AES)

// Middleware to parse JSON bodies
app.use(bodyParser.json());

function decryptPayload(encryptedData) {
  // Decode from Base64 to get the encrypted bytes
  const encryptedBytes = Buffer.from(encryptedData, 'base64');
  
  // Create the decipher with the AES key and IV
  let decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  
  // Decrypt the data
  let decrypted = decipher.update(encryptedBytes, null, 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

function verifySignature(payload, signature, timestamp, projectId) {
  const data = `${projectId}${aesKey}${timestamp}${payload}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  return hash === signature;
}


// Handle POST requests to the /webhook endpoint
app.post('/webhook', (req, res) => {
    console.log('Received webhook:', req.body);
    
    // Verify the signature
    if (!verifySignature(req.body.payload, req.body.signature, req.body.timestamp, req.body.project_id)) {
      console.log('Invalid signature');
      return res.status(403).send('Invalid signature');
    }

    // Assuming encrypted data comes as a hex string in the payload field
    const decryptedMessage = decryptPayload(req.body.payload);
    console.log('Decrypted payload:', decryptedMessage);



    // Respond with a status of 200 and a simple message
    res.status(200).send('ok');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
