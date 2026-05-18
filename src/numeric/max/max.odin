/*
    Finds the maximum of a set of values
*/
package main

import "core:fmt"
import "core:os"
import "core:strconv"

// Find the max value of the given array
max :: proc(values: []$T) -> T {
    current := values[0]
    for i in 0..<len(values) {
        if values[i] > current {
            current = values[i]
        }
    }
    return current
}

// The main entry point to the application
main :: proc() {
    args: [dynamic]int
    defer delete(args)
    
    for i in 1..<len(os.args) {
        val, ok := strconv.parse_int(os.args[i]);
        if ok {
            append(&args, val)
        }
    }
    if (len(os.args) < 2) {
        append(&args, 15, 10)
    }
    maxvalue := max(args[:])

	fmt.println(args, "\ngcd: ", maxvalue)
}
