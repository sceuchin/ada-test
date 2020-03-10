(ns solution
  (:require [ring.middleware.reload :refer [wrap-reload]]
            [ring.util.response :refer [response status]]
            [compojure.core :refer [GET POST defroutes]]
            [clojure.java.jdbc :as jdbc]
            [clojure.string :as str]
            [cheshire.core :as json]
            [clojure.pprint :refer [pprint]]
            [ring.adapter.jetty :refer [run-jetty]]
            [ring.middleware.json :refer [wrap-json-response wrap-json-params]]))


(def db-spec  {:classname   "org.sqlite.JDBC"
               :subprotocol "sqlite"
               :subname     "../database.db"})

(defn messages []
  (let [messages  (jdbc/query db-spec ["SELECT * FROM messages"])
        state-raw (jdbc/query db-spec ["SELECT id, value FROM state"])
        state     (reduce (fn [acc val] (assoc acc (:id val) (:value val))) {} state-raw)]
    (for [msg messages
          :let [m (:body msg)]]
      (str/replace m #"\{(.+?)\|(.*?)\}"
                   (fn [[_ id fallback]]
                     (get state id fallback))))))

(defn search [query]
  (letfn   [(extract-text [block]
              (if (sequential? block)
                (mapcat extract-text block)
                (map (fn [[key val]]
                       (if (sequential? val)
                         (str/join (mapcat extract-text val))
                         (when (not= :type key)
                           val)))
                     (seq block))))]

    (let [query-terms (str/split (str/lower-case query) #"\s+")
          answers-raw (jdbc/query db-spec ["select
                                              a.id, a.title, b.content
                                            from
                                              answers a
                                            join blocks b
                                              on a.id=b.answer_id"])
          answers     (map (fn [{:keys [id title content]}]
                             {:id      id
                              :title   title
                              :content (json/parse-string content keyword)})
                           answers-raw)]

      (filter (fn [answer]
                (let [content-text (str/join (extract-text (:content answer)))
                      full-text (str/lower-case (str (:title answer) " " content-text))]
                  (every? true?
                          (map (fn [term] (str/includes? full-text term)) query-terms))))
              answers))))

(defroutes app-routes
  (GET "/messages" [] (response (messages)))
  (POST "/search" [query]
        (if (and (string? query) (not= "" query))
          (response (search query))
          (-> (response "Query missing or empty") (status 400)))))

(defn app []
  (-> #'app-routes
      (wrap-json-response)
      (wrap-json-params)
      (wrap-reload {:dirs "."})))

(defn -main [& args]
  (run-jetty (app) {:port 5000 :join? false}))
