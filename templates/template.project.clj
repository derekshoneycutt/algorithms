(defproject $fileNameWithoutExt "1.0.0"
  :dependencies [[org.clojure/clojure "1.12.0"]]
  :resource-paths ["resources"]
  :main algo.main
  :target-path "target/%s"
  :profiles {:uberjar {:aot :all}})
