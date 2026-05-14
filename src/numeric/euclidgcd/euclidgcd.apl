⍝ This will calculate the greatest common denominator between 2 values

args ← 2 ⎕NQ '#' 'GetCommandLineArgs'

⍝ Get the last two elements and flatten them into a single string with spaces
(valid vals) ← ⎕VFI ⊃,/ (¯2↑args) ,¨ ' '
(m n) ← 2 ↑ (valid / vals), 15 10

⎕ ← (⍕ m), ' ', (⍕ n), ⎕UCS 10
⎕ ← 'gcd: ', (⍕ m ∨ n), ⎕UCS 10

)OFF
