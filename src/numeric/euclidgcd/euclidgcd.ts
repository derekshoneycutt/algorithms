/*
    Calculate the GCD of two values and print it all to the screen
 */

/**
 * Calculate the GCD using Euclid's algorithm
 * 
 * @param m The first value to calculate the GCD for
 * @param n The second value to calculate the GCD for
 * @returns The calculated GCD
 */
function euclidgcdt(m: number,n: number): number {
    let r: number;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

// Attempt to get the first 2 command line parameters, using 15, 10 as default
var m = 15;
var n = 10;
if (process.argv.length >= 4) {
    m = parseInt(process.argv[2]);
    n = parseInt(process.argv[3]);
}

console.log(`${m} ${n}`);
console.log(`gcd: ${euclidgcdt(m, n)}`);
