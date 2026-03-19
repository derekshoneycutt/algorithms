import itertools

def prime_sieve():
    yield 2
    cache = [2]
    candidate = 3
    while True:
        if all(candidate % prime != 0 for prime in cache):
            yield candidate
            cache.append(candidate)
        
        candidate += 2

def get_primes(count):
    return list(itertools.islice(prime_sieve(), count))

def print_primes(primes):
    print("First Five Hundred Primes")
    for i in range(50):
        print(f"     {primes[i]:04d} {primes[i + 50]:04d}" +
              f" {primes[i + 100]:04d} {primes[i + 150]:04d}" +
              f" {primes[i + 200]:04d} {primes[i + 250]:04d}" +
              f" {primes[i + 300]:04d} {primes[i + 350]:04d}" +
              f" {primes[i + 400]:04d} {primes[i + 450]:04d}")

print_primes(get_primes(500))
