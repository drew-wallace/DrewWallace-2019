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
    const generateKeyPair = util.promisify(crypto.generateKeyPair)
    const writeFile = util.promisify(fs.writeFile)

    const command = process.argv[2]

    const body = {}

    switch(command) {
        case 'register':
            body.password = process.argv[3]
            break
        case 'store':
            body.password = process.argv[3]
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
                            passphrase: process.argv[4]
                        }
                    }
                )

                await writeFile('client_private.pem', privateKey, 'utf8')

                body.publicKey = publicKey
            } catch (err) {
                console.error(err)
                return
            }

            break
        case 'message':
            try {
                const privateKey = crypto.createPrivateKey({
                    key: fs.readFileSync('client_private.pem'),
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase: process.argv[3]
                })
                const sign = crypto.createSign('SHA256')
                sign.write(process.argv[4])
                sign.end()
                const signature = sign.sign(privateKey, 'hex')
                console.log(`${Buffer.from(process.argv[4], 'utf8').toString('hex')}|${signature}`)
            } catch (err) {
                console.error('Error: Failed to decrypt private key')
            }

            return
        case 'verify':
            body.message = process.argv[3]
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