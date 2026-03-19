const std = @import("std");

fn max(values: std.ArrayList(i32)) i32 {
    var current: i32 = 0;
    for (values.items) |value| {
        if (value > current) {
            current = value;
        }
    }
    return current;
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    var values: std.ArrayList(i32) = .empty;
    defer values.deinit(allocator);

    if (args.len > 1) {
        for (args[1..]) |arg| {
            const t = std.fmt.parseInt(i32, arg, 10) catch 0;
            try values.append(allocator, t);
        }
    } else {
        try values.append(allocator, 15);
        try values.append(allocator, 10);
    }

    const maximum = max(values);

    std.debug.print("values: {any}\nmax: {}\n", 
        .{ values.items, maximum });
}
