
function euclidgcd(m, n)
    r = 0
    while n != 0
        r = m % n
        m = n
        n = r
    end
    return m
end

m = 15
n = 10

if length(ARGS) >= 2
    m = parse(Int, ARGS[1])
    n = parse(Int, ARGS[2])
end

println(m, " ", n)
println("gcd: ", euclidgcd(m, n))
