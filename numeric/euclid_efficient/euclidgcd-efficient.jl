
function euclidgcd_efficient(m, n)
    m = m % n
    while m != 0
        n = n % m
        if n == 0
            return m        
        end
        m = m % n
    end
    return n
end

v_1 = 10
v_2 = 15

if length(ARGS) >= 2
    v_1 = parse(Int, ARGS[1])
    v_2 = parse(Int, ARGS[2])
end

println(v_1, " ", v_2)
println("gcd: ", euclidgcd_efficient(v_1, v_2))
