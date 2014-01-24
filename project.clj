(defproject tag-slideshow "0.1.0-SNAPSHOT"
    :description "Quick and dirty Instagram slideshow based on a tag"
    :url "http://github.com/markmandel/tagslideshow"
    :license {:name "Eclipse Public License"
              :url  "http://www.eclipse.org/legal/epl-v10.html"}
    :dependencies [[org.clojure/clojure "1.5.1"]
                   [clojurewerkz/propertied "1.1.0"]
                   [instagram-api "0.1.7"]
                   [http-kit "2.1.16"]
                   [selmer "0.5.9"]
                   [compojure "1.1.5"]
                   [dieter "0.4.1"]]
    :plugins [[lein-ancient "0.5.2"]]
    :main ^:skip-aot tag-slideshow.core
    :target-path "target/%s"
    :profiles {:uberjar {:aot :all}
               :dev     {:dependencies [[org.clojure/tools.namespace "0.2.4"]
                                        [org.clojure/tools.trace "0.7.6"]
                                        [org.clojars.gjahad/debug-repl "0.3.3"]]
                         :source-paths ["dev"]
                         :repl-options {:init-ns user}
                         }
               :cljs    {:dependencies [[org.clojure/clojurescript "0.0-2138"]
                                        [com.google.javascript/closure-compiler "v20131014"]
                                        [im.chit/purnam "0.1.8"]
                                        [jayq "2.5.0"]]
                         :exclusions   [dieter http-kit compojure selmer instagram-api]
                         :plugins      [[lein-cljsbuild "0.3.3"]]
                         :codox        {:sources    ["src-cljs"]
                                        :output-dir "doc/cljs"}
                         :cljsbuild    {
                                           ;; compile test first, it's a faster feedback loop.
                                           :builds [{:id             "source"
                                                     ; The path to the top-level ClojureScript source directory:
                                                     :source-paths   ["src-cljs"]
                                                     :notify-command ["notify-send"]
                                                     ; The standard ClojureScript compiler options:
                                                     ; (See the ClojureScript compiler documentation for details.)
                                                     :compiler       {:output-to     "resources/public/js/main.js"
                                                                      :output-dir    "resources/public/js/target"
                                                                      :optimizations :whitespace
                                                                      :pretty-print  true
                                                                      :source-map    "resources/public/js/main.js.map"
                                                                      }
                                                     }]}}})
