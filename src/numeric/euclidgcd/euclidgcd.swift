import Foundation

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

var m = 15
var n = 10

if (CommandLine.argc >= 3) {
    m = Int(CommandLine.arguments[1]) ?? 15
    n = Int(CommandLine.arguments[2]) ?? 10
}

let gcd = euclidgcd(m_in: m, n_in: n)

print("\(m) \(n)")
print("gcd: \(gcd)")
