(;
  This calculates GCD for any 2 numbers.
;)
(module
  (import "env" "jsprint" (func $jsprint (param i32 i32 i32 i32)))

  (memory $0 1)
  (data	(i32.const 0) "%d %d\ngcd: %d\00")
  
  (export "pagememory" (memory $0))

  ;; This is the GCD function that will calculate the GCD
  (func $euclidgcd (param $m_in i32) (param $n_in i32) (result i32)
    (local $r i32) (local $m i32) (local $n i32)
    local.get $m_in
    local.set $m
    local.get $n_in
    local.set $n

    (loop $loop_label
        local.get $m
        local.get $n
        i32.rem_u
        local.set $r
        
        local.get $n
        local.set $m
        
        local.get $r
        local.set $n

        local.get $n
        i32.const 0
        i32.ne
        br_if $loop_label
    )

    local.get $m
  )

  ;; our "run" method that our js loader will call into
  (func $run (export "run")
    (local $m i32) (local $n i32) (local $gcd i32)

    i32.const 15
    local.set $m
    i32.const 10
    local.set $n

    ;; At this time, it does not seem to be worth it to attempt
    ;;  doing command line parameters with wasm

    local.get $m
    local.get $n
    (call $euclidgcd)
    local.set $gcd

    i32.const 0
    local.get $m
    local.get $n
    local.get $gcd
    (call $jsprint)
  )
)
