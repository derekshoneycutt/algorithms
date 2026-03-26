; This application just prints hello to the screen with puts
@.str = private unnamed_addr constant [15 x i8] c"Hello, world!\0A\00"

declare i32 @puts(ptr captures(none)) nounwind

; This is the main entry; returns 0 for success
define i32 @main() {
  call i32 @puts(ptr @.str)
  ret i32 0
}
