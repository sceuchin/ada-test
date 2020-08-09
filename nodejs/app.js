const sqlite3 = require("sqlite3").verbose()
const express = require("express")

const app = express()
app.use(express.json())

const db = new sqlite3.Database("../database.db", sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message)
    }
})

// Return all messages
app.get("/messages", (req, res) => {    

    const updateStates = (stateIds, msgMatches) => {
        
        // get states from DB for all stateIds
        db.all(`select id, value from state where id in (${stateIds.map(function(){ return "?" }).join(",")})`, stateIds, (err, rows) => {
            messages = msgMatches.map(msgMatch => {

                let message = msgMatch.message
                msgMatch.matches.forEach(match => {                    
                    const found = rows.some(row => {
                        if (match[1] === row.id) {
                            message = message.split(match[0]).join(row.value)
                            return true
                        }
                    })
                    if (!found) {
                        message = message.replace(match[0], match[2])
                    }
                });

                return message
            })
            res.send(messages)
        })
    }

    db.all("select body from messages", {}, (err, rows) => {	
        // use regex to match {stateId|fallback}
        const regexp = /{([0-9a-f]{32})\|([\w ]*)}/g 	

        // to reduce calls to the db, store all stateIds
        const stateIds = [];
        msgMatches = rows.map(row => {
            const matches = [...row.body.matchAll(regexp)]
            const uniqueMatches = matches.filter((val, idx, arr) => arr.findIndex(match => (match[0] === val[0])) === idx)
            stateIds.push(...matches.map(match => match[1]))
            return {
                matches: uniqueMatches,
                message: row.body
            }
        })
        
        updateStates([...new Set(stateIds)], msgMatches)
    })
})

// Search for answers
app.post("/search", (req, res) => {
    let query = req.body.query

    db.all(
        "select id, title from answers where title like $query",
        { $query: "%" + query + "%" },
        (err, rows_raw) => {
            res.status(200).send(rows_raw)
        }
    )

})



var server = app.listen(5000, () => {
    console.log("Express server listening on port " + server.address().port)
})
