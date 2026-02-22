
def get_primes():
    primes = [2]
    n = 3

    for j in range(500):
        primes.append(n)

        is_prime = False
        while not is_prime:
            n += 2

            q = 9999
            r = 1
            t = 0
            k = 1
            while (r != 0) and (q > t):
                t = primes[k]
                q = n / t
                r = n % t
                k += 1
            is_prime = (r != 0) and (q <= t)
    return primes

def print_primes(primes):
    print("First Five Hundred Primes")
    for i in range(50):
        print(f"     {primes[i]:04d} {primes[i + 50]:04d}" +
              f" {primes[i + 100]:04d} {primes[i + 150]:04d}" +
              f" {primes[i + 200]:04d} {primes[i + 250]:04d}" +
              f" {primes[i + 300]:04d} {primes[i + 350]:04d}" +
              f" {primes[i + 400]:04d} {primes[i + 450]:04d}")

print_primes(get_primes())
