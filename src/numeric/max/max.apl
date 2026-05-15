⍝ Finds the maximum in a set of numbers and prints it to the screen

⍝ Get all command line args as nums via execute or 15 10
cmd_args ← 1 ↓ 2⎕NQ '.' 'GetCommandLineArgs'
args ← ⍎¨ '15' '10' {0=≢⍵: ⍺ ⋄ ⍵} cmd_args

⍝ just use APL's max
max_val ← ⌈/ args
⎕ ← 'values: ', args, ⎕UCS 10
⎕ ← 'max: ', max_val, ⎕UCS 10

)OFF

