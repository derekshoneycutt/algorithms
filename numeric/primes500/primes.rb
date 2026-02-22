
def get_primes()
    primes = [2]
    n = 3

    for j in 1..500 do
        primes << n

        is_prime = false
        while !is_prime
            n += 2

            q = 9999
            r = 1
            t = 0
            k = 1
            while (r != 0) && (q > t)
                t = primes[k]
                q = n / t
                r = n % t
                k += 1
            end

            is_prime = (r != 0) && (q <= t)
        end
    end
    return primes
end

def print_primes(primes)
    puts "First Five Hundred Primes"
    for i in 0..49 do
        puts "     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d" % [
            primes[i], primes[50 + i], primes[100 + i], primes[150 + i],
            primes[200 + i], primes[250 + i], primes[300 + i],
            primes[350 + i], primes[400 + i], primes[450 + i]]
    end
end

print_primes(get_primes())
