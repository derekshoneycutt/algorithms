=begin
    Calculate the GCD for two values and print it all to the screen
=end

# Calculate the GCD using Euclid's algorithm
def euclidgcd(m, n)
    while n != 0
        r = m % n
        m = n
        n = r
    end
    return m
end

# Attempt to get the first to command line arguments or use 15, 10
m = 15
n = 10
if ARGV.length >= 2
    m = ARGV[0].to_i
    n = ARGV[1].to_i
end

puts "#{m} #{n}"
puts "gcd: #{euclidgcd(m, n)}"
