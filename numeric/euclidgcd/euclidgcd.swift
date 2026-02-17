import Foundation

func euclidgcd(m_in: Int, n_in: Int) -> Int {
    var m = m_in
    var n = n_in
    var r = m % n
    while (r != 0) {
        m = n
        n = r
        r = m % n
    }
    return n
}

var m = 15
var n = 10

if (CommandLine.argc >= 2) {
    m = Int(CommandLine.arguments[1]) ?? 15
    n = Int(CommandLine.arguments[2]) ?? 10
}

print("\(m) \(n)")
let gcd = euclidgcd(m_in: m, n_in: n)
print("gcd: \(gcd)")
