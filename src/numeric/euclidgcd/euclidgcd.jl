#=
    Calculates the GCD of two values and prints it all to the screen
=#

"""
Calculates the GCD with Euclid's method
"""
function euclidgcd(m, n)
    r = 0
    while n != 0
        r = m % n
        m = n
        n = r
    end
    return m
end

# if 2+ args are in, try to parse them; otherwise we use 15, 10
m = 15
n = 10
if length(ARGS) >= 2
    m = parse(Int, ARGS[1])
    n = parse(Int, ARGS[2])
end

println(m, " ", n)
println("gcd: ", euclidgcd(m, n))
