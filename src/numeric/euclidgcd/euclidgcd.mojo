from std.sys.arg import argv
from std.collections.string import atol

def euclidgcd(m_in: Int, n_in: Int) raises -> Int:
    var r: Int
    var m = m_in
    var n = n_in
    while n != 0:
        r = m % n
        m = n
        n = r
    return m


def main() raises:
    var m: Int
    var n: Int
    var args = argv()
    if len(args) > 2:
        m = atol(args[1])
        n = atol(args[2])
    else:
        m = 15
        n = 10

    var gcd = euclidgcd(m, n)

    print(t"{m} {n}")
    print(t"gcd: {gcd}")
