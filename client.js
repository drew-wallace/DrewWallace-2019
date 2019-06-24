const https = require('https')
const fs = require('fs')
const util = require('util')
const crypto = require('crypto')


if (process.argv.length < 4 || process.argv.length > 5) {
    console.error('Expected: `node client.js <command> <arg0> [arg1]`')
    return
} else if (process.argv.length === 4) {
    if (process.argv[2] === 'store') {
        console.error('Expected: `node client.js store <password> <private key passphrase>`')
        return
    } else if (process.argv[2] === 'message') {
        console.error('Expected: `node client.js message <private key passphrase> <message>`')
        return
    }
}


(async () => {
    const command = process.argv[2]

    const body = {}

    switch(command) {
        case 'register':
            register(body, process.argv[3])
            break
        case 'store':
            const err = await store(body, process.argv[3], process.argv[4])
            if (err) {
                console.error(err)
                return
            }

            break
        case 'message':
            message(process.argv[3], process.argv[4])
            return
        case 'verify':
            verify(body, process.argv[3])
            break
    }

    const postData = JSON.stringify(body)

    const options = {
        hostname: 'localhost',
        port: 8000,
        path: `/${encodeURIComponent(command)}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        },

        ca: [fs.readFileSync('server.crt')],
        rejectUnauthorized: true,
        requestCert: true,
        agent: false
    }

    const req = https.request(options, (res) => {
        res.setEncoding('utf8')

        res.on('data', (data) => {
            console.log(data)
        })
    })

    req.on('error', (err) => {
        console.error(err)
    })

    req.write(postData)

    req.end()
})()

function register(body, password) {
    body.password = password
}

// RSA public/private key generation: 4096 bit key size, private key encrypted with aes-256-cbc
async function store(body, password, passphrase) {
    const generateKeyPair = util.promisify(crypto.generateKeyPair)
    const writeFile = util.promisify(fs.writeFile)

    body.password = password
    try {
        const {publicKey, privateKey} = await generateKeyPair(
            'rsa',
            {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase
                }
            }
        )

        await writeFile('client_private.pem', privateKey, 'utf8')

        body.publicKey = publicKey
    } catch (err) {
        return err
    }
}

// Creates a string containing a message and a signature generated from the client's private key
function message(passphrase, message) {
    try {
        const privateKey = crypto.createPrivateKey({
            key: fs.readFileSync('client_private.pem'),
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase
        })
        const sign = crypto.createSign('SHA256')
        sign.write(message)
        sign.end()
        const signature = sign.sign(privateKey, 'hex')
        console.log(`${Buffer.from(message, 'utf8').toString('hex')}|${signature}`)
    } catch (err) {
        console.error('Error: Failed to decrypt private key')
    }
}

function verify(body, message) {
    body.message = process.argv[3]
}