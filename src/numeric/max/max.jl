#=
    Finds the maximum value from any set of values
=#

"""
Finds the maximum of a set of values

Julia's type system makes this inherently generic by not specifying a type
"""
function max(values::Vector{T}) where T <: Number
    current = zero(T)
    for value in values
        if current < value
            current = value
        end
    end
    return current
end

# We try to grab all the command lines or just use 15, 10
list = [15, 10]
if length(ARGS) > 0
    list = [parse(Int, arg) for arg in ARGS]
end

maxValue = max(list)

println("values: ", list)
println("max: ", maxValue)
