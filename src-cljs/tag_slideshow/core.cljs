(ns ^{:doc "Application"}
    tag-slideshow.core
    (:use [purnam.cljs :only [aget-in aset-in]]
          [jayq.core :only [$ append attr data remove-class add-class on html]])
    (:use-macros
        [purnam.js :only [f.n obj ! ?]]
        [jayq.macros :only [let-ajax]]))

;;variables
(def images (atom []))

;;functions
(defn log
    [& messages]
    (-> ($ "#debug") (append (str messages "<br />")))
    )

(defn- pop-image!
    []
    (let [image (first @images)]
        (swap! images rest)
        image))

(defn set-image!
    [id image]
    (-> id $ (attr "src" (get-in image [:image "url"])))
    (-> "#profile-pic" $ (data "src" (:profile-pic image)))
    (-> "#text" $ (data "caption" (:caption image)))
    (-> "#name" $ (data "name" (:name image))))

(defn init-images
    []
    (let [image (pop-image!)]
        (set-image! "#top" image)))

(defn load-data!
    ([]
     (load-data! false))
    ([init]
     (let-ajax [data {:url "/data" :dataType :edn}]
               (swap! images concat data)
               (when init
                   (init-images))
               (log "image count: " (count @images))
               )))

(defn check-images!
    []
    (when (< (count @images) 5)
        (load-data!)))

(defn- timeout-image-switch
    [id]
    (js/setTimeout (fn []
                       (set-image! id (pop-image!))) (* 1000 5))
    (check-images!))

(defn- switch-caption!
    []
    (let [profile-pic ($ "#profile-pic")
          text ($ "#text")
          name ($ "#name")]
        (attr profile-pic "src" (data profile-pic "src"))
        (html text (data text "caption"))
        (html name (data name "name"))))

(defn- top-load-handler
    [e]
    (log "top loaded!")
    (-> "#top" $ (remove-class "transparent"))
    (switch-caption!)
    (timeout-image-switch "#bottom")
    )

(defn- bottom-load-handler
    [e]
    (log "bottom loaded!")
    (-> "#top" $ (add-class "transparent"))
    (switch-caption!)
    (timeout-image-switch "#top"))

(defn init-handlers!
    []
    (-> "#top" $ (on "load" top-load-handler))
    (-> "#bottom" $ (on "load" bottom-load-handler))
    )


;; do on load
(log "Starting!")
(try
    (init-handlers!)
    (load-data! true)
    (catch js/Object e
        (log "Exception!")
        (log e)
        ))