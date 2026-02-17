
function euclidgcd(m, n)
    r = m % n
    while r != 0
        m = n
        n = r
        r = m % n
    end
    return n
end

v_1 = 15
v_2 = 10

if length(ARGS) >= 2
    v_1 = parse(Int, ARGS[1])
    v_2 = parse(Int, ARGS[2])
end

println(v_1, " ", v_2)
println("gcd: ", euclidgcd(v_1, v_2))
