require('dotenv').config();

const fs = require('fs');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(cookieParser());

app.set('view engine', 'ejs');

app.use('/static', express.static(__dirname + '/static'));

app.post('/valid-key', (req, res) => {
    res.status(201);
    const keys = JSON.parse(fs.readFileSync(__dirname + '/keys.json'));
    const key = keys.find(k => k.id === req.body.key);
    if(!key) {
        res.json({ valid: false });
        return;
    }
    if(key.status !== 'not-used') {
        res.json({ valid: false });
        return;
    }
    res.json({ valid: true });
});

app.get('/upload', (req, res) => {
    res.render('upload');
});

app.get('/upload-request', (req, res) => {
    const keys = JSON.parse(fs.readFileSync(__dirname + '/keys.json'));
    const key = keys.find(k => k.id === req.cookies.key);
    if(!key) {
        res.json({ grant: false });
        return;
    }
    if(key.status !== 'not-used') {
        res.json({ grant: false });
        return;
    }
    res.json({ grant: true });
    keys.map(k => {
        if(k.id === req.cookies.key) {
            k.status = 'upload';
            k.addr = req.ip;
        } else {
            return k;
        }
    });
    fs.writeFileSync(__dirname + '/keys.json', JSON.stringify(keys, null, 4));
});

const writers = {}

app.post('/upload-file', (req, res) => {
    res.status(201);
    const keys = JSON.parse(fs.readFileSync(__dirname + '/keys.json'));
    const key = keys.find(k => k.id === req.cookies.key);
    if(!key) res.status(404).end();
    if(key.status !== 'upload') res.status(404).end();
    console.log(`Writing ch ${req.body.index} of ${req.body.total} - ${req.body.fname} - ${req.cookies.key}`);
    if(req.body.index === 1) {
        keys.map(k => {
            if(k.id === req.cookies.key) {
                k.file = {
                    name: req.body.fname,
                    path: __dirname + '/path/'
                }
            } else {
                return k;
            }
        });
        fs.writeFileSync(__dirname + '/keys.json', JSON.stringify(keys, null, 4));
        writers[req.cookies.key] = fs.createWriteStream(__dirname + '/files/' + req.body.fname);
    }
    writers[req.cookies.key].write(req.body.ch);
    if(req.body.index === req.body.total) {
        keys.map(k => {
            if(k.id === req.cookies.key) {
                k.status = 'used';
                delete k.addr;
            } else {
                return k;
            }
        });
        fs.writeFileSync(__dirname + '/keys.json', JSON.stringify(keys, null, 4));
        writers[req.cookies.key].close();
    }
    res.json({ ok: 'ok' });
});

app.get('/file/:id', (req, res) => {
    const keys = JSON.parse(fs.readFileSync(__dirname + '/keys.json'));
    const key = keys.find(k => k.id === req.params.id);
    if(!key) {
        res.render('file', {
            title: 'Invalid File',
            inUpload: false,
            invalid: true
        });
        return;
    }
    switch(key.status) {
        case 'used':
            const size = fs.statSync(key.file.path + key.file.name).size / 1024 / 1024 / 1024;
            res.render('file', {
                title: key.file.name,
                id: req.params.id,
                file: {
                    name: key.file.name,
                    size: size
                },
                inUpload: false,
                invalid: false
            });
        break;
        case 'upload':
            res.render('file', {
                title: key.file.name,
                inUpload: true,
                invalid: false
            });
        break;
        default:
            res.render('file', {
                title: 'Invalid File',
                inUpload: false,
                invalid: true
            });
    }
});

app.get('/dl/:id', (req, res) => {
    const keys = JSON.parse(fs.readFileSync(__dirname + '/keys.json'));
    const key = keys.find(k => k.id === req.params.id);
    if(key.status === 'used') {
        res.download(`${key.file.path}${key.file.name}`);
    } else {
        res.status(404);
    }
});

http.createServer(app).listen(process.env.PORT_HTTP);