(;
  This prints hello to the screen
  We utilize an environment object passing a jsprint
    method. This is specific to our build setup, and
    is less relevant in ordinary use cases.
;)
(module
  (import "env" "jsprint" (func $jsprint (param i32)))

  (memory $0 1)
  (data	(i32.const 0) "Hello, world!\00")
  
  (export "pagememory" (memory $0))

  ;; our "run" method that our js loader will call into
  (func $run (export "run")
    (call $jsprint (i32.const 0))
  )
)
