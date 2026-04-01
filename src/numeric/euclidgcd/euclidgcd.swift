/*
    Calculate the GCD between two values and print it all to the screen
*/

import Foundation

/// Calculates the GCD using Euclid's algorithm
/// 
/// Parameters
/// ------------
/// - `m_in`: The first value to calculate the GCD for
/// - `n_in`: The second value to calculate the GCD for
/// 
/// Returns
/// ------------
/// The calculated GCD value
func euclidgcd(m_in: Int, n_in: Int) -> Int {
    var m = m_in
    var n = n_in
    var r = 0
    while (n != 0) {
        r = m % n
        m = n
        n = r
    }
    return m
}

// Attempt to get first 2 command line arguments, or 15, 10
var m = 15
var n = 10
if (CommandLine.argc >= 3) {
    m = Int(CommandLine.arguments[1]) ?? 15
    n = Int(CommandLine.arguments[2]) ?? 10
}

let gcd = euclidgcd(m_in: m, n_in: n)

print("\(m) \(n)")
print("gcd: \(gcd)")
