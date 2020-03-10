const sqlite3 = require('sqlite3').verbose();
var express = require('express')

var app = express()
app.use(express.json());

let db = new sqlite3.Database('../database.db');

// Return all messages
app.get('/messages', function (req, res) {
    db.all("select body from messages",{},(err, messages) => {
        db.all("select id, value from state",{},(err, state_raw) => {
            // put it into a dictionary for easier handling
            let state = state_raw.reduce((acc, val) => {
                acc[val.id] = val.value
                return acc
            }, {})

            // Replace all matches
            let fullMessages = messages.map(message => {
                return message.body.replace(/{(.+?)\|(.*?)}/g, (full, id, fallback) => {
                    return state[id] || fallback
                });
            });
            res.send(fullMessages)
        });
    });
})

// Search for answers
app.post('/search', function (req, res) {
    let query = req.body.query
    if(! query)
        return res.status(400).send("Bad query")

    let queryTerms = query.toLowerCase().split(" ")

    db.all(`select
                a.id, a.title, b.content
            from
                answers a
            join blocks b
                on a.id=b.answer_id`, {}, (err, rows_raw) => {

               let rows = rows_raw.map((r) => {
                   return {"id": r.id, "title": r.title, content: JSON.parse(r.content)}
               })

               let matched_rows = rows.filter(answer => {

                   // create a big string that includes all content text
                   let extract_text = (block) => {
                       if (Array.isArray(block)) {
                           return block.map(extract_text)
                       }
                       var text = ""
                       for (let [key, value] of Object.entries(block)) {
                           if(Array.isArray(value)){
                               text += value.map(extract_text)
                           }
                           else if(key != "type") {
                               text += " " +value
                           }
                       }
                       return text
                   }

                   // mash it all together and normalize it
                   let fulltext = (answer.title + " " + extract_text(answer.content).join(" ")).toLowerCase()

                   // see if all the terms show up
                   for(term of queryTerms) {
                       if(! fulltext.includes(term))
                           return false
                   }
                   return true
               })

               res.status(200).send(matched_rows)
           });

})

var server = app.listen(5000, function() {
    console.log('Express server listening on port ' + server.address().port);
});
