import sys

def euclidgcd(m, n):
    r = m % n
    while r != 0:
        m = n
        n = r
        r = m % n
    return n

v_1 = 10
v_2 = 15

if len(sys.argv) >= 2:
    v_1 = int(sys.argv[1])
    v_2 = int(sys.argv[2])

print(f"{v_1} {v_2}")
print(f"gcd: {euclidgcd(v_1, v_2)}")
    