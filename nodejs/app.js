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
        // Get states from DB for all stateIds
        db.all(
            `select id, value from state where id in (${stateIds.map(function(){ return "?" }).join(",")})`, 
            stateIds, 
            (err, rows) => {
                if (err) {
                    res.status(400).send(err.message)
                    return
                }

                messages = msgMatches.map(msgMatch => {

                    let message = msgMatch.message
                    msgMatch.matches.forEach(match => {                    
                        const found = rows.some(row => {
                            if (match[1] === row.id) {
                                message = message.split(match[0]).join(row.value)
                                return true
                            }
                        })
                        // Use fallback string if state is not found
                        if (!found) {
                            message = message.split(match[0]).join(match[2])
                        }
                    })

                    return message
                })
            res.send(messages)
        })
    }

    db.all("select body from messages", {}, (err, rows) => {        
        if (err) {
            res.status(400).send(err.message)
            return
        }	

        // Use regex to match {stateId|fallback}
        const regexp = /{([0-9a-f]{32})\|([^{}]*)}/g 	

        // To reduce calls to the db, store all stateIds in an array and 
        // query state table only once to get all the states we need
        const stateIds = []
        msgMatches = rows.map(row => {
            const matches = [...row.body.matchAll(regexp)]
            const uniqueMatches = matches.filter(
                (val, idx, arr) => arr.findIndex(match => (match[0] === val[0])) === idx)
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
    const query = req.body.query
    // Check for empty or just whitespaces
    if (!query || /^\s*$/.test(query)) {
        res.status(400).send("Invalid query")
        return
    }
    
    const queries = query.split(" ").map(query => query.toLowerCase())

    // Recursive function to search in the nested content block fields
    const hasQuery = (query, node) => {
        if (!node) {
            return false
        }
        if (Array.isArray(node)) {
            return node.some(val => hasQuery(query, val))
        }
        if (typeof node === "string" || node instanceof String) {
            return node.toLowerCase().includes(query)
        }

        return Object.keys(node)
            .filter(key => key !== "type")
            .some(key => hasQuery(query, node[key]))        
    } 

    db.all(
        "select a.id, a.title, b.content from answers a join blocks b on a.id = b.answer_id where title like $query or content like $query",
        { $query: "%" + queries[0] + "%" }, // Check for first word in search query to return fewer rows from the DB while keeping it speedy
        (err, rows_raw) => {            
            if (err) {
                res.status(400).send(err.message)
                return
            }

            const answers = rows_raw
                .map(row => { 
                    return {...row, contentStr: row.content, content: JSON.parse(row.content)} 
                })
                .filter(answer => {
                    // Not using regex in case there are special characters in any of the queries 
                    // In order to use regex, we'll have to escape all possible special characters, 
                    // so better to just do lowercase for a case-insensitive compare
                    const title = answer.title.toLowerCase()
                    const content = answer.contentStr.toLowerCase()
                    
                    return queries.every(query => {
                        if (title.includes(query)) {
                            return true
                        }
                        // Only do the recursive search within content when we're sure the query can be found in it
                        // because the recursive search is an expensive procedure
                        if (content.includes(query)) {
                            return hasQuery(query, answer.content)
                        }
                        return false
                    })
                })
                .map(({ contentStr, ...answer }) => answer)

            res.status(200).send(answers)
        }
    )

})



var server = app.listen(5000, () => {
    console.log("Express server listening on port " + server.address().port)
})
