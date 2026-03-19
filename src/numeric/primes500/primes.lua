
local primes = coroutine.wrap(function()
    coroutine.yield(2)
    local cache = {2}
    local candidate = 3
    while true do
        local isprime = true
        for i, prime in ipairs(cache) do
            if candidate % prime == 0 then
                isprime = false
                break
            end
        end
        if isprime then
            coroutine.yield(candidate)
            table.insert(cache, candidate)
        end

        candidate = candidate + 2
    end
end)

function take(n, coroutine)
    local results = {}
    local count = 1
    for value in coroutine do
        results[count] = value
        count = count + 1
        if count > n then
            break
        end
    end
    return results
end

function print_primes(primes)
    print("First Five Hundred Primes")
    for i = 1, 50 do
        print(string.format("     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d",
            primes[i], primes[i + 50], primes[i + 100], primes[i + 150],
            primes[i + 200], primes[i + 250], primes[i + 300], primes[i + 350],
            primes[i + 400], primes[i + 450]))
    end
end

print_primes(take(500, primes))
