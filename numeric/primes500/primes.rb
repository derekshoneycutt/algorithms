
def prime_sieve()
    Enumerator.new do |yielder|
        yielder << 2
        cache = [2]
        candidate = 3
        while true
            if cache.all? { |prime| candidate % prime != 0 }
                yielder << candidate
                cache << candidate
            end

            candidate += 2
        end
    end
end

def get_primes(count)
    return prime_sieve().take(count)
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

print_primes(get_primes(500))
