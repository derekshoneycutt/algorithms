(module
  (import "env" "jsprint" (func $jsprint (param i32)))

  (memory $0 1)
  (data	(i32.const 0) "Hello, world!\00")
  
  (export "pagememory" (memory $0))

  (func $helloworld
    (call $jsprint (i32.const 0))
  )

  (export "run" (func $helloworld))
)
