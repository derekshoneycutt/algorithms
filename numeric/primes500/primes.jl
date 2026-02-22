
function get_primes()
    primes = [2]
    n = 3

    for i = 1:500
        push!(primes, n)

        is_prime = false
        while !is_prime
            n += 2

            q = 9999
            r = 1
            t = 0
            k = 2
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

function print_primes(primes)
    println("First Five Hundred Primes")
    for i = 1:50
        println("     ", string(primes[i], pad=4), " ",
            string(primes[50 + i], pad=4), " ",
            string(primes[100 + i], pad=4), " ",
            string(primes[150 + i], pad=4), " ",
            primes[200 + i], " ", primes[250 + i], " ",
            primes[300 + i], " ", primes[350 + i], " ",
            primes[400 + i], " ", primes[450 + i])
    end
end

print_primes(get_primes())
