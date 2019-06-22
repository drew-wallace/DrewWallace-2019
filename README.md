# Server setup
1) Install Node v12.4.0
2) Generate a Private Key
```
cd DrewWallace-2019/
openssl genrsa -des3 -out server.key 1024
```
3) Generate a CSR (Certificate Signing Request)
```
openssl req -new -key server.key -out server.csr
```
  - Note: make sure to put `localhost` for the `Common Name` field and ignore the `'extra' attributes` at the end of the questions.
4) Remove Passphrase from Key
```
cp server.key server.key.org
openssl rsa -in server.key.org -out server.key
```
5) Generating a Self-Signed Certificate
```
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```

# How to use
1) Run the server
```
node server.js
```
2) Register the client
```
node client.js register "this is a test password"
```
3) Create a public/private key and send the public key to the server to be stored
```
node client.js store "this is a test password" "test private key passphrase"
```
4) Generate a message with a signature
```
node client.js message "test private key passphrase" "test message to be verified"
```
5) Verify message from previous step
```
node client.js verify "74657374206d65737361676520746f206265207665726966696564|249b0e809a54bb691de74ce98ea10aec3a7e3e497ebb4bb66e5d2125d0257b0aea50bc34523f4667008778da0111ef56492abf4ea177fd16e04a97d831a9c11cef8cf7dabf735869b5abb0e7096933831f4bb2e19a1cbc6ce61eb354a7574e9ea9afa968ea638193d97af93c8224f8f03b2ed6d3e2dd977706c79ce4e696eef628cda321ec75fbca6d4c224e88ceff889d3ebd16e4638a1293dbc3ecdabe1961b1858af534428802763cd60489f8b7ffab41bb20d5bec7be0f4ca229052fdc9ec6a8dd37412444b21228887963066d90676174b29d4764cdd0c4075bfad19e6472afd6c7008cd11e95fa7711a3a3095e0f6db7cd155f6a02729880e1abb0de22aef6b4dda67d096058ecb546f61ed4801974db78aa261eaeeb88b3b560944999ec8ca17445c1109d2ca1455b8fa5e84eb7978b18030af88788163243d54c1a5142db49a3ebdcf01a61ddf928ceb0e5d1f0a12e909867667793afaae9e72b02ed530eb22e79a6cb19851e45dd803c30e9d470001fbaf3f121962f8a6aefaf831fcef9d5ccc404aa6ed71dcf7afcaa777e8dbad5d6392997830fd5191aa21de2381b7c0d1ce11fbba04d7b13b8aaaa4c5d35b89f226cb1efbf64f2bc0ba6addaf9458fa81e09841de6a5a96660ccdcc0e2fc3a9aa1d9025f8dda6bb5ea34c3fc1a23e8baa2f19c6d17803040bb746e6a8cfa4e822f8c007b180138e210ca638327"
```
  - Note: the long string above was copied from the previous command output