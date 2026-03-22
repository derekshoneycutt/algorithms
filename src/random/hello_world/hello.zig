//! This prints hello to the screen

const std = @import("std");

/// The main entry point for the application.
pub fn main() !void {
    // we can use debug print for these purposes
    std.debug.print("Hello, world!\n", .{});
}
