@.str = private unnamed_addr constant [15 x i8] c"Hello, world!\0A\00"

declare i32 @puts(ptr captures(none)) nounwind

define i32 @main() {
  ; Call puts function to write out the string to stdout.
  call i32 @puts(ptr @.str)
  ret i32 0
}
