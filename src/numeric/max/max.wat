(;
    This gets the maximum value of a sequence of values
;)

(module
  (import "env" "jsprint" (func $jsprint (param i32 i32)))
  (import "env" "jsprint" (func $jsprints (param i32)))

  (memory $0 1)
  (data	(i32.const 0) "   %d\00")
  (data	(i32.const 8) "max: %d\00")
  (data	(i32.const 16) "value:\00")

  (export "pagememory" (memory $0))

  ;; Function to get the max number from an array in memory
  (func $max (param $p i32) (param $n i32) (result i32)
    (local $max i32) (local $i i32) (local $v i32) (local $end i32)
    i32.const 0
    local.set $max
    local.get $n
    i32.const 4
    i32.mul
    local.get $p
    i32.add
    local.set $end
    local.get $p
    local.set $i

    (loop $max_loop
      local.get $i
      i32.load
      local.set $v
      local.get $v
      local.get $max
      i32.gt_s
      if
        local.get $v
        local.set $max
      end

      local.get $i
      i32.const 4
      i32.add
      local.set $i
      local.get $i
      local.get $end
      i32.lt_s
      br_if $max_loop
    )

    local.get $max
  )

  ;; our "run" method that our js loader will call into
  (func $run (export "run")
    (local $i i32) (local $v i32) (local $max i32)

    i32.const 32  i32.const 15  i32.store
    i32.const 36  i32.const 10  i32.store
    i32.const 40  i32.const 56  i32.store
    i32.const 44  i32.const 35  i32.store
    i32.const 48  i32.const 86  i32.store
    i32.const 52  i32.const 72  i32.store
    i32.const 56  i32.const 25  i32.store
    i32.const 60  i32.const 49  i32.store

    i32.const 16
    (call $jsprints)

    i32.const 32
    local.set $i
    (loop $display_loop
        local.get $i
        i32.load
        local.set $v
        i32.const 0
        local.get $v
        (call $jsprint)

        i32.const 4
        local.get $i
        i32.add
        local.set $i
        local.get $i
        i32.const 64
        i32.lt_s
        br_if $display_loop
    )

    i32.const 32
    i32.const 8
    (call $max)
    local.set $max

    i32.const 8
    local.get $max
    (call $jsprint)
  )
)
