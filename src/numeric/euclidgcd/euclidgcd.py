import sys

def euclidgcd(m, n):
    while n != 0:
        r = m % n
        m = n
        n = r
    return m

m = 15
n = 10

if len(sys.argv) >= 3:
    m = int(sys.argv[1])
    n = int(sys.argv[2])

print(f"{m} {n}")
print(f"gcd: {euclidgcd(m, n)}")
