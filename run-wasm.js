const fs = require('fs');

if (process.argv.length < 2) {
    console.log("You must enter a wasm file to open");
}
else {
    var memory;

    async function run() {
        const wasmBuffer = fs.readFileSync(process.argv[2]);

        const { instance } = await WebAssembly.instantiate(wasmBuffer, {
            env: {
                jsprint: function jsprint(byteOffset) {
                    var s = '';
                    var a = new Uint8Array(memory.buffer);
                    for (var i = byteOffset; a[i]; i++) {
                        s += String.fromCharCode(a[i]);
                    }
                    console.log(s);
                }
            }
        });

        memory = instance.exports.pagememory;
        instance.exports.run();
    }

    run();
}
