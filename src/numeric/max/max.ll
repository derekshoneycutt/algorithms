; This application finds the maximum of a sequence of values
@.headstr = private unnamed_addr constant [9 x i8] c"values:\0A\00"
@.valuestr = private unnamed_addr constant [8 x i8] c"    %d\0A\00"
@.maxstr = private unnamed_addr constant [9 x i8] c"max: %d\0A\00"

declare i64 @strtol(ptr, ptr, i32) nounwind
declare i32 @printf(ptr nocapture, ...) nounwind

; The max function to find the max value
define i32 @max(ptr %values, i32 %count) {
entry:
    %i = alloca i32, align 4
    store i32 0, i32* %i, align 4
    %curr = alloca i32, align 4
    store i32 0, i32* %curr, align 4

    br label %loop.start

loop.start:
    %usei = load i32, i32* %i, align 4
    %cond = icmp slt i32 %usei, %count
    br i1 %cond, label %loop.body, label %loop.end

loop.body:
    %valueptr = getelementptr inbounds i32, ptr %values, i32 %usei
    %value = load i32, i32* %valueptr, align 4
    %currval = load i32, i32* %curr, align 4
    %i_next = add i32 %usei, 1
    store i32 %i_next, i32* %i, align 4
    %incond = icmp sgt i32 %value, %currval
    br i1 %incond, label %loop.setnew, label %loop.start

loop.setnew:
    store i32 %value, i32* %curr, align 4
    br label %loop.start

loop.end:
    %final_max = load i32, i32* %curr, align 4
    ret i32 %final_max
}

; This is the main entry; returns 0 for success
define i32 @main(i32 %argc, ptr %argv) {
entry:
    %arg_count = sub i32 %argc, 1
    %alloc_count = call i32 @llvm.smax.i32(i32 %arg_count, i32 2)
    %alloc_count_i64 = sext i32 %alloc_count to i64
    %values = alloca i32, i64 %alloc_count_i64, align 4

    ; if we have >= 2 arguments, we use command line arguments; otherwise the default
    %has_args = icmp sgt i32 %argc, 2
    br i1 %has_args, label %parse_args, label %use_defaults

parse_args:
    %i = alloca i32, align 4
    store i32 0, i32* %i, align 4
    br label %parse_loop

parse_loop:
    %i_curr = load i32, i32* %i, align 4
    %j = add i32 %i_curr, 1
    %done_cond = icmp sge i32 %j, %argc
    br i1 %done_cond, label %call_max, label %parse_body

parse_body:
    %j_i64 = sext i32 %j to i64
    %argvp = getelementptr inbounds ptr, ptr %argv, i64 %j_i64
    %argstr = load ptr, ptr %argvp, align 8
    %arg_ptr = alloca ptr
    %int_i64 = call i64 @strtol(ptr %argstr, ptr %arg_ptr, i32 10)
    %int_i32 = trunc i64 %int_i64 to i32
    %i_i64 = sext i32 %i_curr to i64
    %valueptr = getelementptr inbounds i32, ptr %values, i64 %i_i64
    store i32 %int_i32, ptr %valueptr, align 4
    store i32 %j, i32* %i, align 4
    br label %parse_loop

use_defaults:
    %p0 = getelementptr inbounds i32, ptr %values, i64 0
    store i32 15, ptr %p0, align 4
    %p1 = getelementptr inbounds i32, ptr %values, i64 1
    store i32 10, ptr %p1, align 4
    br label %call_max

call_max:
    %max_val = call i32 @max(ptr %values, i32 %alloc_count)

; Once we have the max, we then print all the values and the max
    %printon = alloca i32, align 4
    store i32 0, i32* %printon, align 4
    call i32 (ptr, ...) @printf(ptr noundef @.headstr)
    br label %print_loop

print_loop:
    %printon_curr = load i32, i32* %printon, align 4
    %print_more = icmp slt i32 %printon_curr, %alloc_count
    br i1 %print_more, label %print_body, label %print_end

print_body:
    ; Print each value
    %printvalueptr = getelementptr inbounds i32, ptr %values, i32 %printon_curr
    %printvalue = load i32, i32* %printvalueptr, align 4
    call i32 (ptr, ...) @printf(ptr noundef @.valuestr, i32 %printvalue)
    %printon_next = add i32 %printon_curr, 1
    store i32 %printon_next, i32* %printon, align 4
    br label %print_loop


print_end:
    call i32 (ptr, ...) @printf(ptr noundef @.maxstr, i32 %max_val)
    
    ret i32 0
}
