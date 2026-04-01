/*
    Calculates the GCD for two values and prints it all to the screen
*/

/**
 * Calculates the GCD for two values with Euclid's method
 * @param {Number} m The first value to calculate GCD for
 * @param {Number} n The second value to calculate GCD for
 * @returns The calculated GCD
 */
function euclidgcd(m,n) {
    let r;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

// Use the first 2 command line parameters after the filename or 15, 10
var m = 15;
var n = 10;
if (process.argv.length >= 4) {
    m = parseInt(process.argv[2]);
    n = parseInt(process.argv[3]);
}

console.log(`${m} ${n}`);
console.log(`gcd: ${euclidgcd(m, n)}`);
