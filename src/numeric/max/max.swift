/*
    Get the maximum value of some sequence of values
*/

import Foundation

/// Get the maximum value of some list
/// 
/// 
/// Parameters
/// ----------
/// - `list`: The list of values to find the maximum of
/// 
/// Returns
/// ----------
/// The maximum value
func max_list<T: Comparable>(list: [T]) -> T? {
    guard !list.isEmpty else { return nil }
    var current = list[0]
    for value in list {
        if value > current {
            current = value
        }
    }
    return current
}

var list = [15, 10]
if (CommandLine.argc > 1) {
    list = CommandLine.arguments.dropFirst(1).map { Int($0) ?? 0 }
}

print("values: \(list)")
if let max_value = max_list(list: list) {
    print("max: \(max_value)")
} else {
    print("max: n/a")
}
