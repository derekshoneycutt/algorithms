# Calculates the GCD of two values and prints it all to the screen

from std.sys.arg import argv
from std.collections.string import atol

def euclidgcd(m_in: Int, n_in: Int) raises -> Int:
    """
    Calculates the greatest common denominator between 2 numbers.

    This utilizes Euclid's algorithm to find and return GCD.

    Parameters
    ----------
    m
        The first number to calculate GCD for.
    n
        The second number to calculate GCD for.

    Returns
    --------
        The greatest common denominator for the 2 numbers.
    """
    var r: Int
    var m = m_in
    var n = n_in
    while n != 0:
        r = m % n
        m = n
        n = r
    return m


def main() raises:
    """
    The main entry point to the application.

    We try to take 2 arguments from command line or use 15, 10.
    """
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
