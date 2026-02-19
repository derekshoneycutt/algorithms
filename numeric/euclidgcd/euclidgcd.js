
function euclidgcd(m,n) {
    let r;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

var m = 15;
var n = 10;

if (process.argv.length >= 4) {
    m = parseInt(process.argv[2]);
    n = parseInt(process.argv[3]);
}

console.log(`${m} ${n}`);
console.log(`gcd: ${euclidgcd(m, n)}`);
