from std.collections.list import List

def get_primes(n: Int) raises -> List[Int]:
    var primes = List[Int]()
    primes.append(2)
    var candidate = 3
    while len(primes) < n:
        var is_prime = True
        for prime in primes:
            if candidate % prime == 0:
                is_prime = False
                break
        if is_prime:
            primes.append(candidate)
        candidate = candidate + 2
    return primes^

def pad(n: Int) raises -> String:
    var unpadded = String(t"{n}")
    var padded = ""
    if len(unpadded) < 4:
        for _ in range(4 - len(unpadded)):
            padded += "0"
    padded += unpadded
    return padded

def print_primes(primes: List[Int]) raises:
    print("First Five Hundred Primes")
    var l : Int = len(primes) / 10
    for index in range(l):
        print(String(t"   {pad(primes[index])} {pad(primes[index + l])}") +
              String(t" {pad(primes[index + l * 2])} {pad(primes[index + l * 3])}") +
              String(t" {pad(primes[index + l * 4])} {pad(primes[index + l * 5])}") +
              String(t" {pad(primes[index + l * 6])} {pad(primes[index + l * 7])}") +
              String(t" {pad(primes[index + l * 8])} {pad(primes[index + l * 9])}"))

def main() raises:
    print_primes(get_primes(500))

