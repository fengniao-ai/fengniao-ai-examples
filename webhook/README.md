# Webhook Server and Client Simulation

This repository contains a client simulation program (fengniaoClient.py) and server implementations in Python, Go, Node.js, and Java. Each server can receive and process webhook events by decrypting payloads, verifying signatures, and handling the request appropriately.

## Client Simulation

### `fengniaoClient.py`

This Python script simulates sending a webhook event to the server. It takes command-line arguments for `project_id`, `api_key`, `webhook_url`, and `payload`.

#### Usage

```sh
python3 fengniaoClient.py --project_id <project_id> --api_key <api_key> --webhook_url <webhook_url> --payload <path_to_payload_json>

python3 fengniaoClient.py --project_id vYexrXKqrlTtNu23uKJoi --api_key oFcTbSzdmOzXF2DZ72h9ILdLsXTE8qK1 --webhook_url http://localhost:3000/webhook --payload payload.json
```

## Server Implementations
### Python: webhook.py

#### Usage
Install dependencies
```sh
pip install Flask cryptography
```

Running the Server
```sh
python webhook.py
```


### Go: webhook.go
Ensure you have Go installed. 

#### Usage

Running the Server
```sh
go run webhook.go

```

### Node.js: webhook.js


#### Usage

Install dependencies
```sh
npm install express crypto
```

Running the Server
```sh
node webhook.js

```


### Java: webhook.java
Java JDK (version 8 or later)

#### Usage

Build Server
```sh
javac -cp .:json-20210307.jar webhook.java
```

Running the Server
```sh
java -cp .;json-20210307.jar webhook

```

## Testing the Setup
- Start the server of your choice (Python, Go, Node.js, or Java).
- Run the fengniaoClient.py script with the appropriate arguments to simulate a webhook event.
