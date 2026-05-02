=begin
    This program finds the max value of a sequence of values
=end

# Find the max value inside a list
def max_list(list)
    current = 0
    list.each do |value|
        if value > current
            current = value
        end
    end
    return current
end

list = [15, 10]
if ARGV.length > 0
    list = ARGV.map { |arg| arg.to_i }
end

maxValue = max_list(list)

puts "values: #{list}"
puts "max: #{maxValue}"
