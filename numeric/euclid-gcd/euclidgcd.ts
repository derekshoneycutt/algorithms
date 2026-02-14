
function euclidgcdt(m: number,n: number): number {
    let r: number = m % n;
    while (r != 0) {
        m = n;
        n = r;
        r = m % n;
    }
    return n;
}

var v_1 = 10;
var v_2 = 15;

if (process.argv.length >= 4) {
    v_1 = parseInt(process.argv[2]);
    v_2 = parseInt(process.argv[3]);
}

console.log(`${v_1} ${v_2}`);
console.log(`${euclidgcdt(v_1, v_2)}`);
