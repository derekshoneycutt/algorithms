; This application computes the GCD between 2 integers
@.str = private unnamed_addr constant [15 x i8] c"%d %d\0Agcd: %d\0A\00"

declare i64 @strtol(ptr, ptr, i32) nounwind
declare i32 @printf(ptr nocapture, ...) nounwind

; This is the GCD function that calculates the GCD
define i32 @euclidgcd(i32 %min, i32 %nin) {
entry:
    ; We start loading values into temporary variables
    %m = alloca i32, align 4
    %n = alloca i32, align 4
    %r = alloca i32, align 4
    store i32 %min, i32* %m, align 4
    store i32 %nin, i32* %n, align 4
    store i32 0, i32* %r, align 4

    br label %loop.body

loop.body:
    ; Then the loop; loop while n != 0
    %mt = load i32, i32* %m, align 4
    %nt = load i32, i32* %n, align 4
    %rt = srem i32 %mt, %nt
    store i32 %rt, i32* %r, align 4

    store i32 %nt, i32* %m, align 4
    store i32 %rt, i32* %n, align 4

    %cond = icmp ne i32 %rt, 0
    br i1 %cond, label %loop.body, label %loop.end

loop.end:
    ; When n == 0, m is the GCD, we return it
    %final_gcd = load i32, i32* %m, align 4
    ret i32 %final_gcd
}

; This is the main entry; returns 0 for success
define i32 @main(i32 %argc, ptr %argv) {
entry:
    %m = alloca i32, align 4
    %n = alloca i32, align 4
    store i32 15, i32* %m, align 4
    store i32 10, i32* %n, align 4

    %argccond = icmp uge i32 %argc, 3
    br i1 %argccond, label %argParse, label %calcAndPrint

argParse:
    ; If we have 2 or more arguments, we parse the first 2 as integers
    %argv1_gep = getelementptr inbounds ptr, ptr %argv, i64 1
    %argv1_str_ptr = load ptr, ptr %argv1_gep, align 8
    %endptr1_ptr = alloca ptr
    %int1_i64 = call i64 @strtol(ptr %argv1_str_ptr, ptr %endptr1_ptr, i32 10)
    %int1_i32 = trunc i64 %int1_i64 to i32
    store i32 %int1_i32, i32* %m, align 4

    %argv2_gep = getelementptr inbounds ptr, ptr %argv, i64 2
    %argv2_str_ptr = load ptr, ptr %argv2_gep, align 8
    %endptr2_ptr = alloca ptr
    %int2_i64 = call i64 @strtol(ptr %argv2_str_ptr, ptr %endptr2_ptr, i32 10)
    %int2_i32 = trunc i64 %int2_i64 to i32
    store i32 %int2_i32, i32* %n, align 4

    br label %calcAndPrint

calcAndPrint:
    ; Calculate and print to the screen
    %mt = load i32, i32* %m, align 4
    %nt = load i32, i32* %n, align 4
    %gcd = call i32 @euclidgcd(i32 %mt, i32 %nt)

    call i32 (ptr, ...) @printf(ptr noundef @.str, i32 %mt, i32 %nt, i32 %gcd)
    ret i32 0
}
