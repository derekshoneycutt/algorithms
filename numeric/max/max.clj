
(defn mymax [^ints values]
  (reduce (fn [curr next]
            (if (> next curr)
              next
              curr)) values))

(defn argsAsInts [args default]
  (if (>= (count args) 2)
    (reduce (fn [vals next]
              (conj vals (Integer/valueOf next)))
            [] (drop 1 args))
    default))

(let [args *command-line-args*
      intargs (argsAsInts args [15, 10])
      maxval (mymax intargs)]
  (printf "%d\n" maxval))

