/*
 *  This script loads up some WAT-coded WASM and runs it.
 *  We necessarily have to provide anything to the world outside of WASM
 *  if we hope to use anything outside of WASM. Like a print function.
 */

const fs = require('fs/promises');

if (process.argv.length < 2) {
    console.log("You must enter a wasm file to open");
}
else {
    var memory;

    async function run() {
        const wasmBuffer = await fs.readFile(process.argv[2]);

        const { instance } = await WebAssembly.instantiate(wasmBuffer, {
            env: {
                jsprint: function jsprint(byteOffset, ...args) {
                    var s = '';
                    var a = new Uint8Array(memory.buffer);
                    for (var i = byteOffset; a[i]; i++) {
                        s += String.fromCharCode(a[i]);
                    }
                    console.log(s, ...args);
                }
            }
        });

        memory = instance.exports.pagememory;
        instance.exports.run();
    }

    run();
}
