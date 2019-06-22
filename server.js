const https = require('https')
const fs = require('fs')
const crypto = require('crypto')

let clientPasswordHash = ''
let clientPublicKey = ''

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
}

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

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex')
    try {
        const hash = await new Promise((resolve, reject) => crypto.pbkdf2(password, salt, 100000, 512, 'sha512', (err, derivedKey) => {
            if (err) {
                reject(err)
            }

            resolve(derivedKey.toString('hex'))
        }))
        return `${salt}|${hash}`
    } catch(err) {
        console.error(err)
        return ''
    }
}

async function verifyHash(password, storedSaltHash) {
    const [salt, hash] = storedSaltHash.split('|')
    try {
        const newHash = await new Promise((resolve, reject) => crypto.pbkdf2(password, salt, 100000, 512, 'sha512', (err, derivedKey) => {
            if (err) {
                reject(err)
            }

            resolve(derivedKey.toString('hex'))
        }))
        return newHash === hash
    } catch(err) {
        console.error(err)
        return false
    }
}

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

async function register(res, password) {
    clientPasswordHash = await hashPassword(password)

    if (clientPasswordHash) {
        res.writeHead(200)
        res.end('Client registered')
    } else {
        res.writeHead(400)
        res.end('Error: could not register')
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
