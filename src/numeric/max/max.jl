
function max(values)
    current = 0
    for value in values
        if current < value
            current = value
        end
    end
    return current
end

list = [15, 10]
if length(ARGS) > 0
    list = [parse(Int, arg) for arg in ARGS]
end

maxValue = max(list)

println("values: ", list)
println("max: ", maxValue)
