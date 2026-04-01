(comment
  ;; Calculate the GCD between two numbers and print it to the screen
  )

; Calculates the GCD via recursive form of Euclid's algorithm 
(defn euclidgcd [m n]
  (if (= n 0)
    m
    (euclidgcd n (rem m n))))

; Gets a command line argument as an integer value
(defn argAsInt [args index default]
  (if (>= (count args) 3)
    (Integer/valueOf (nth args index))
    default))

; Our main run code; pulls the command line arguments OR 15, 10, calculates
; GCD and prints them all to the screen.
(let [args *command-line-args*
      m (argAsInt args 1 15)
      n (argAsInt args 2 10)
      gcd (euclidgcd m n)]
  (printf "%d %d\ngcd: %d\n" m n gcd))
