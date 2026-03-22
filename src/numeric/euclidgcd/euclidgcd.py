# Calculates Greatest Common Denominator via Euclid's Algorithm
import sys

def euclidgcd(m, n):
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
    while n != 0:
        r = m % n
        m = n
        n = r
    return m

m = 15
n = 10

# we attempt to get it from the command line if a couple have been passed
if len(sys.argv) >= 3:
    m = int(sys.argv[1])
    n = int(sys.argv[2])

print(f"{m} {n}")
print(f"gcd: {euclidgcd(m, n)}")
