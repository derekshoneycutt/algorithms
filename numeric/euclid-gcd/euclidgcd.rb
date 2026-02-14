
def euclidgcd(m, n)
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

if ARGV.length >= 2
    v_1 = ARGV[0].to_i
    v_2 = ARGV[1].to_i
end

puts "#{v_1} #{v_2}"
puts "#{euclidgcd(v_1, v_2)}"
