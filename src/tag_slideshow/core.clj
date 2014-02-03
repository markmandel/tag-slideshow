(ns tag-slideshow.core
    (:gen-class)
    (:require [clojurewerkz.propertied.properties :as p]
              [clojure.java.io :as io]
              [org.httpkit.server :as server]
              [compojure.core :as comp]
              [compojure.handler :as handler]
              [compojure.route :as route]
              [ring.middleware.cookies :as cookies]
              [selmer.parser :as selmer]
              [dieter.core :as dieter]
              [instagram.oauth :as oauth]
              [instagram.api.endpoint :as api]))

(defn create-system
    "Create the system"
    []
    (let [props (p/load-from (io/file "instagram.properties"))]
        {:oauth-creds
                 (oauth/make-oauth-creds (get props "client.id")
                                         (get props "client.secret")
                                         "http://localhost:9000")
         :instagram-tag (get props "instagram.tag")
         :music-url (get props "music.url")
         :clients (atom {})
         :dieter {:engine     :v8
                  :compress   false ; minify using Google Closure Compiler & Less compression
                  :cache-mode :production ; or :production. :development disables cacheing
                  }}))

(defn load-instagram-photos
    "loads the photos"
    [system]
    (println "Getting instagram images...")
    (let [response (api/get-tagged-medias :oauth (:oauth-creds system) :params {:tag_name (:instagram-tag system) :count 50})]
        (map (fn [data]
                 (let [user (get data "user")
                       image (get-in data ["images" "standard_resolution"])
                       caption (get-in data ["caption" "text"])]
                     {:name        (get user "full_name")
                      :profile-pic (get user "profile_picture")
                      :image       image
                      :caption     caption}))
             (filter #(= (get % "type") "image")
                     (-> response :body (get "data"))))))

(defn- index-page
    "Render the index page"
    [system]
    (selmer/render-file "views/index.html"
                        {:less (dieter/link-to-asset "main.less" (:dieter system))
                         :music-url (:music-url system)
                         :instagram-tag (:instagram-tag system)}))

(defn- create-routes
    [system]
    (comp/routes
        (comp/GET "/" [] (index-page system))
        (comp/GET "/data" [] (-> system load-instagram-photos prn-str))
        (route/resources "/public")
        (route/not-found "<h1>404 OMG</h1>")))

(defn run-server
    "runs the server, and returns the stop function"
    [system]
    (server/run-server (-> (handler/site (create-routes system)) (dieter/asset-pipeline (:dieter system))) {:port 9000}))

(defn start!
    "START!"
    [system]
    (println "Started")
    (if-not (:server system)
        (assoc system :server (run-server system))
        system))

(defn stop!
    "STOP!"
    [system]
    (when (:server system)
        ((:server system)))
    (println "Stopped")
    system)


(defn -main
    "I don't do a whole lot ... yet."
    [& args]
    (start! (create-system)))

