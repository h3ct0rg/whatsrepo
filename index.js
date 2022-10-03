const { Client, MessageMedia } = require('whatsapp-web.js');
const app = require('express')();
const express = require('express');
var qrcode = require('qrcode-terminal');
const server = require('https').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const QRCode2 = require('qrcode');

app.use(express.json({ limit: '50mb' }));

let connections = [];

app.get('/', (req, res) => {
    res.send('hello world');
})

app.get('/itsSynced', function (req, res) {
    let id = req.query.id;
    let conn = connections.find(d => d.id == id);
    if (conn) {
        res.send(conn['status']);
    }
    else {
        res.send(false);
    }
});

app.get('/getContacs', async function (req, res) {
    let id = req.query.id;
    let conn = connections.find(d => d.id == id);
    if (conn) {
        console.log("listContacts");
        let data = await conn['cliente'].getContacts();
        console.log(data);
        let resultPased = data.map(item => {
            return { nombre: item.name, telefono: item.number };
        })
        res.send(resultPased);
    }
    else {
        res.send(false);
    }
});

app.post('/sendByIDListNumber', async function (req, res) {
    let values = req.body;
    let id = values['id'];
    let phones = values['phones'];
    let pics = values['pics'];
    let message = values['message'];
    console.log(phones);
    console.log(phones.length);
    res.send(message);

    let conn = connections.find(d => d.id == id);
    if (conn) {
        if (conn['status']) {
            for (var i = 0; i < phones.length; i++) {
                let item = phones[i];
                await conn['cliente'].sendMessage("591" + item + "@c.us", values['message']);
                console.log("telefono listado: " + i);
                console.log(pics.length);
                await sleep(2000).then(d => { console.log("espere") });
                for (var a = 0; a < pics.length; a++) {
                    let data = new MessageMedia();
                    data.mimetype = "image/jpeg";
                    data.filename = "attachedFile";
                    data.data = pics[a];
                    conn['cliente'].sendMessage("591" + item + "@c.us", data);
                    await sleep(1000).then(d => { console.log("espere") });
                }
                await sleep(2000).then(d => { console.log("espere phone:" + phones[i]) });
            }
        }
    }
});

io.on("connection", socket => {

    let valueID = socket.handshake.headers['id'];

    if (valueID) {
        console.log("starting");
        console.log(valueID);
        let search = connections.find(d => d.id == valueID);

        if (search === undefined) {
            connections.push({ id: valueID, cliente: new Client(), status: false, trys: 0 });

            let conn = connections.find(d => d.id == valueID);
            console.log(conn);

            socket.on(valueID, (message) => {
                console.log(message);

                conn['cliente'].on('qr', async (qr) => {

                    console.log('QR for: ' + message + ' RECEIVED', qr);
                    qrcode.generate(qr, { small: true });
                    console.log(qrcode);

                    const qrOption = {
                        margin: 7,
                        width: 350
                    };

                    QRCode2.toDataURL(qr, qrOption).then(url => {
                        io.emit(valueID, `
                            <h2>QRCode Generated</h2>
                            <div><img src='${url}'/></div>
                          `)
                    }).catch(err => {
                        console.debug(err)
                    })

                    //io.emit(valueID, qr);
                });

                conn['cliente'].on('ready', () => {
                    console.log('Client: ' + valueID + ' is ready!');
                    conn['status'] = true;
                    io.emit(valueID, "ready");
                });

                conn['cliente'].initialize();

            })

            socket.on('disconnect', () => {
                console.log("desconectado");
            });
        }
        else {
            if (!(search['status'])) {
                socket.on(valueID, (message) => {
                    console.log(message);

                    search['cliente'].on('qr', async (qr) => {
                        console.log('QR for: ' + message + ' RECEIVED', qr);
                        io.emit(valueID, qr);
                    });

                    search['cliente'].on('ready', () => {
                        console.log('Client: ' + valueID + ' is ready!');
                        conn['status'] = true;
                        io.emit(valueID, "ready");
                    });

                    search['cliente'].initialize();

                })
            }
            else {
                console.log("iniciado");
            }
        };
    }
    else {
        console.log("need send an ID");
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


server.listen(443);