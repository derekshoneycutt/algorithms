@.str = private unnamed_addr constant [15 x i8] c"Hello, world!\0A\00"

declare i32 @puts(ptr captures(none)) nounwind

define i32 @main() {
  call i32 @puts(ptr @.str)
  ret i32 0
}
