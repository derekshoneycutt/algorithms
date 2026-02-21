import Foundation

func max_list(list: [Int]) -> Int {
    var current = 0
    for value in list {
        if (value > current) {
            current = value
        }
    }
    return current
}

var list = [15, 10]

if (CommandLine.argc > 1) {
    list = CommandLine.arguments.dropFirst(1).map { Int($0) ?? 0 }
}

let max_value = max_list(list: list)

print("values: \(list)")
print("max: \(max_value)")
