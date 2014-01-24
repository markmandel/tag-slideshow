(ns user
    "Tools for interactive development with the REPL. This file should
    not be included in a production build of the application."
    (:use [clojure.pprint :only (pprint)]
          [clojure.repl]
          [clojure.tools.namespace.repl :only (refresh refresh-all set-refresh-dirs)]
          [clojure.tools.trace])
    (:require [tag-slideshow.core :as core]))

;; system init functions

;; dont' refresh the tests. This fires off the functional tests.
(defn set-refresh-src!
    "Just set source as the refresh dirs"
    []
    (set-refresh-dirs "./src" "./dev"))

(defn set-refresh-all!
    "Set src, dev and test as the directories"
    []
    (set-refresh-dirs "./src" "./dev" "./test"))

(def system
    "A Var containing an object representing the application under
      development."
    nil)

(defn create
    "Creates and initializes the system under development in the Var
      #'system."
    []
    (alter-var-root #'system (constantly (core/create-system))))

(defn start
    "Starts the system running, updates the Var #'system."
    []
    (alter-var-root #'system core/start!))

(defn stop
    "Stops the system if it is currently running, updates the Var
      #'system."
    []
    (alter-var-root #'system core/stop!))

(defn go
    "Initializes and starts the system running."
    []
    (create)
    (start)
    :ready)

(defn reset
    "Stops the system, optionally reloads modified source files, and restarts it."
    []
    (stop)
    (set-refresh-src!)
    (refresh :after 'user/go))
