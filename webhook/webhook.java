import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import javax.xml.bind.DatatypeConverter;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import org.json.JSONObject;

public class webhook {

    private static final String KEY = "oFcTbSzdmOzXF2DZ72h9ILdLsXTE8qK1";
    private static final String IV = "IVa7b9f8d6e54gha"; // Ensure this is 16 bytes

    public static void main(String[] args) throws Exception {
        int port = 3000;
        ServerSocket serverSocket = new ServerSocket(port);
        System.out.println("Server is listening on port " + port);

        while (true) {
            Socket socket = serverSocket.accept();
            new Thread(new ClientHandler(socket)).start();
        }
    }

    private static class ClientHandler implements Runnable {
        private final Socket socket;

        ClientHandler(Socket socket) {
            this.socket = socket;
        }

        public void run() {
          try {
              InputStream input = socket.getInputStream();
              BufferedReader reader = new BufferedReader(new InputStreamReader(input));

              StringBuilder requestHeaders = new StringBuilder();
              String line;
              while (!(line = reader.readLine()).isEmpty()) {
                  requestHeaders.append(line + "\n");
              }

              // Read the payload (body) after headers
              StringBuilder payloadBuilder = new StringBuilder();
              while(reader.ready()) {
                  payloadBuilder.append((char) reader.read());
              }

              String receiveBody = payloadBuilder.toString().trim(); // Get payload, trim for safety
              System.out.println("Received webhook:" + receiveBody); // Debug print to check payload content

              if (receiveBody.isEmpty()) {
                  System.out.println("No payload found.");
                  return;
              }

              //String decodedBody = URLDecoder.decode(receiveBody, "UTF-8");  // Decode URL-encoded data
              JSONObject postData = new JSONObject(receiveBody);
              String payload = postData.getString("payload");
              //String payload = postData.getString("payload").replaceAll("\\s", "");  // Remove any spaces

              System.out.println("payload: " + payload);
              String decryptedMessage = decrypt(payload);
              System.out.println("Decrypted message: " + decryptedMessage);

              if (!verifySignature(decryptedMessage, postData.getString("signature"), postData.getString("project_id"), String.valueOf(postData.getInt("timestamp")))) {
                System.out.println("Invalid signature");

                OutputStream output = socket.getOutputStream();
                PrintWriter writer = new PrintWriter(output, true);
                writer.println("HTTP/1.1 403 Forbidden");
                writer.println("Content-Type: text/plain");
                writer.println("Connection: close");
                writer.println();
                writer.println("Invalid signature");
                socket.close();
                return;
              }

              OutputStream output = socket.getOutputStream();
              PrintWriter writer = new PrintWriter(output, true);
              writer.println("HTTP/1.1 200 OK\r\n");
              writer.println("Content-Type: text/plain\r\n");
              writer.println("Connection: close\r\n");
              writer.println("\r\n");
              writer.println("ok");

              socket.close();
          } catch (Exception e) {
              e.printStackTrace();
          }
        }

        private static boolean verifySignature(String payload, String receivedSignature, String project_id, String timestamp) {
            try {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hashedBytes = digest.digest(( project_id + KEY + timestamp + payload).getBytes("UTF-8"));
                String computedSignature = DatatypeConverter.printHexBinary(hashedBytes).toLowerCase();

                return computedSignature.equals(receivedSignature);
            } catch (NoSuchAlgorithmException | UnsupportedEncodingException ex) {
                System.err.println("Error computing digest: " + ex.getMessage());
                return false;
            }
        }

        private String decrypt(String payload) throws Exception {
            IvParameterSpec iv = new IvParameterSpec(IV.getBytes("UTF-8"));
            SecretKeySpec skeySpec = new SecretKeySpec(KEY.getBytes("UTF-8"), "AES");

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5PADDING");
            cipher.init(Cipher.DECRYPT_MODE, skeySpec, iv);
            byte[] original = cipher.doFinal(Base64.getDecoder().decode(payload));

            return new String(original);
        }
    }

    // Method to extract payload from HTTP request
    private static String parsePayload(String request) {
        // Simplified extraction logic, should parse the request body properly
        return request.substring(request.indexOf("payload=") + 8);
    }
}

