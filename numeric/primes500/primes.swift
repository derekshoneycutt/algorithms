import Foundation

func get_primes() -> [Int] {
    var primes = [Int](repeating: 0, count: 500)
    var n = 3
    primes[0] = 2

    for j in 1...499 {
        primes[j] = n

        var is_prime = false
        while !is_prime {
            n += 2

            var q = 9999
            var r = 1
            var t = 0
            var k = 1
            while (r != 0) && (q > t) {
                t = primes[k]
                q = n / t
                r = n % t
                k += 1
            }

            is_prime = (r != 0) && (q <= t)
        }
    }

    return primes
}

func print_primes(primes: [Int]) {
    print("First Five Hundred Primes")
    for i in 0...49 {
        let one = String(format: "%04d", primes[i])
        let two = String(format: "%04d", primes[i + 50])
        let three = String(format: "%04d", primes[i + 100])
        let four = String(format: "%04d", primes[i + 150])
        let five = String(format: "%04d", primes[i + 200])
        let six = String(format: "%04d", primes[i + 250])
        let seven = String(format: "%04d", primes[i + 300])
        let eight = String(format: "%04d", primes[i + 350])
        let nine = String(format: "%04d", primes[i + 400])
        let ten = String(format: "%04d", primes[i + 450])
        print("     \(one) \(two) \(three) \(four) \(five) \(six) "
            + "\(seven) \(eight) \(nine) \(ten)")
    }
}

print_primes(primes: get_primes())
