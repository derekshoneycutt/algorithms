
(defn mymax [^ints values]
  (reduce (fn [curr next]
            (if (> next curr)
              next
              curr)) values))

(defn argsAsInts [args default]
  (if (>= (count args) 2)
    (map (fn [val] (Integer/valueOf val)) (drop 1 args))
    default))

(let [args *command-line-args*
      intargs (argsAsInts args [15, 10])
      maxval (mymax intargs)]
  (prn "values: ") (println intargs)
  (printf "%d\n" maxval))

