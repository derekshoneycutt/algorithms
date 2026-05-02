//! Gets the maximum value of a sequence of numbers

const std = @import("std");

/// Gets the maximum value of an array of values
/// 
/// Parameters
/// -----------
/// - `type` : The type of the values to get the max for
/// - `values` : The array of values to find the maximum of
/// 
/// Returns
/// ---------
/// The maximum value in the array
fn max(comptime T: type, values: std.ArrayList(T)) T {
    var current: T = values.items[0];
    for (values.items) |value| {
        if (value > current) {
            current = value;
        }
    }
    return current;
}

/// The main entry point of the application
pub fn main(init: std.process.Init) !void {
    var gpa = std.heap.DebugAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    var args = try init.minimal.args.iterateAllocator(allocator);
    defer args.deinit();
    _ = args.next();

    var values: std.ArrayList(i32) = .empty;
    defer values.deinit(allocator);

    // The new argument style in zig for this doesn't have a length so have to use a counter
    var arg_len: i32 = 0;
    while (args.next()) |arg| {
        arg_len += 1;
        const t = std.fmt.parseInt(i32, arg, 10) catch 0;
        try values.append(allocator, t);
    }
    if (arg_len < 1) {
        try values.append(allocator, 15);
        try values.append(allocator, 10);
    }

    const maximum = max(i32, values);

    std.debug.print("values: {any}\nmax: {}\n", 
        .{ values.items, maximum });
}
