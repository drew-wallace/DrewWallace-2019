const https = require('https')
const fs = require('fs')
const crypto = require('crypto')
const util = require('util')

let clientPasswordHash = ''
let clientPublicKey = ''

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
}

// HTTPS server for security in transit
https.createServer(options, (req, res) => {
    req.on('data', (buffer) => {
        const body = JSON.parse(buffer.toString('utf8'))
        switch(req.url) {
            case '/register':
                register(res, body.password)
                return
            case '/store':
                store(res, body.password, body.publicKey)
                return
            case '/verify':
                verify(res, body.message)
                return
        }
    })
}).listen(8000)

// PBKDF2 for security at rest
async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex')
    const pbkdf2 = util.promisify(crypto.pbkdf2)
    try {
        // 16 byte salt, 100,000 iterations (suggested: >=10,000), 512 bit keylength, sha512 hashing algorithm
        const hash = await pbkdf2(password, salt, 100000, 512, 'sha512')
        return `${salt}|${hash.toString('hex')}`
    } catch(err) {
        console.error(err)
        return ''
    }
}

async function verifyHash(password, storedSaltHash) {
    const [salt, hash] = storedSaltHash.split('|')
    const pbkdf2 = util.promisify(crypto.pbkdf2)
    try {
        const newHash = await pbkdf2(password, salt, 100000, 512, 'sha512')
        return newHash.toString('hex') === hash
    } catch(err) {
        console.error(err)
        return false
    }
}

// RSA signature message verification
function verifyMessage(message, publicKey) {
    let [text, signature] = message.split('|')
    const verifier = crypto.createVerify('SHA256')
    verifier.write(Buffer.from(text, 'hex').toString())
    verifier.end()

    try {
        return verifier.verify(publicKey, signature, 'hex')
    } catch (err) {
        console.error(err)
        return false
    }
}

// Only allowing one client "account" to be registered
async function register(res, password) {
    if (!!clientPasswordHash) {
        res.writeHead(401)
        res.end('Error: Client already registered register')
        return
    }

    clientPasswordHash = await hashPassword(password)

    if (clientPasswordHash) {
        res.writeHead(200)
        res.end('Client registered')
    } else {
        res.writeHead(400)
        res.end('Error: Could not register')
    }
}

async function store(res, password, publicKey) {
    const isAuthenticated = await verifyHash(password, clientPasswordHash)
    if (isAuthenticated) {
        clientPublicKey = publicKey
        res.writeHead(200)
        res.end('Public Key stored')
    } else {
        res.writeHead(401)
        res.end('Error: Credentials invalid')
    }
}

function verify(res, message) {
    const isMessageVerified = verifyMessage(message, clientPublicKey)
    if (isMessageVerified) {
        res.writeHead(200)
        res.end('Message verified')
    } else {
        res.writeHead(401)
        res.end('Error: Message not verified')
    }
}
