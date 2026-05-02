(comment
  ;; Find the maximum value of a set of values
  )

; Finds the maximum value
;   No generics, but this just works like a generic case natively
(defn mymax [values]
  (reduce (fn [curr next]
            (if (> next curr)
              next
              curr)) values))

; Gets the command line arguments as an integer values
(defn argsAsInts [args default]
  (if (>= (count args) 2)
    (map (fn [val] (Integer/valueOf val)) (drop 1 args))
    default))

; Our main run code; pulls the command line arguments OR 15, 10,
; find the max value, and prints them all to the screen.
(let [args *command-line-args*
      intargs (argsAsInts args [15, 10])
      maxval (mymax intargs)]
  (prn "values: ") (println intargs)
  (printf "%d\n" maxval))

