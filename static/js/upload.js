document.getElementById('key').addEventListener('input', (e) => {
    fetch('/valid-key', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: e.target.value })
    }).then(res => res.json()).then(res => {
        if(res.valid) {
            document.getElementById('input-key').classList.add('Val');
        } else {
            document.getElementById('input-key').classList.remove('Val');
        }
    });
});

let file;

function _arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for(var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

const CHUNK_SIZE = 1024 * 100;

document.getElementById('file').addEventListener('change', (e) => {
    if(!e.target.files[0]) return;
    file = e.target.files[0];
    document.getElementById('upload-button').innerHTML = file.name;
});

document.getElementById('upload-start').addEventListener('click', () => {
    document.querySelector('.Loader').classList.add('Visible');
    document.cookie = `key=${document.getElementById('key').value}`;
    fetch('/upload-request', {
        method: 'GET'
    }).then(res => res.json()).then(res => {
        if(!res.grant) { 
            document.querySelector('.Loader').classList.remove('Visible');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const f = e.target.result;
            let chunk_index = 0;
            const file_chunks = [];
            for(let i = 0; i < file.size; i += CHUNK_SIZE) {
                file_chunks.push({
                    index: chunk_index++,
                    chunk: f.slice(i, i + CHUNK_SIZE)
                });
            }
            function uploadChunk(index) {
                fetch('/upload-file', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ch: _arrayBufferToBase64(file_chunks[index].chunk),
                        total: file_chunks.length,
                        index: index + 1,
                        fname: file.name
                    })
                }).then(() => {
                    if(index + 1 === file_chunks.length) {
                        document.location.href = `/file/${document.getElementById('key').value}`;
                    } else {
                        document.querySelector('.Loader i').innerHTML = `Upload en cours - ${index / file_chunks.length * 100}%`
                        uploadChunk(index + 1);
                    }
                }).catch(() => {
                    //uploadChunk(index);
                })
            }
            uploadChunk(0);
        }
        reader.readAsArrayBuffer(file);
    });
});