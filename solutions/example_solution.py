from flask import Flask, request, jsonify
import sqlite3
import json
import re


app = Flask(__name__)
DBPATH = "../database.db"


@app.route("/messages", methods=["GET"])
def messages_route():
    """
    Return all the messages
    """

    with sqlite3.connect(DBPATH) as conn:
        messages_res = conn.execute("select body from messages")
        messages_raw = [m[0] for m in messages_res]

        # get all at once instead of back and forth
        state_raw = conn.execute("select id, value from state")
        # load it into hashmap for easy lookup
        state = {r[0]: r[1] for r in state_raw}

        messages = []
        for message in messages_raw:
            # find all matches, separating variable-id and fallback
            matches = re.findall("(\{(.+?)\|(.*?)\})", message)
            for match in matches:
                (orig, var, fallback) = match
                # replace with value if found, otherwise use fallback
                message = message.replace(orig, state.get(var, fallback))
            messages.append(message)

        return jsonify(messages), 200


@app.route("/search", methods=["POST"])
def search_route():
    """
    Search for answers!
    """

    if request.get_json():
        query = request.get_json().get("query")
    else:
        query = None

    if query is None or query == "":
        return "Bad query", 400

    print("query", query)
    res = search(query)

    print(res)
    return jsonify(res), 200


def walk_tree(nodes, fn):
    """
    Walk a nested map and call `fn` on every node
    """

    if isinstance(nodes, list):
        for node in nodes:
            walk_tree(node, fn)
    else:
        fn(nodes)
        listfields = [field for field in nodes.values() if isinstance(field, list)]
        walk_tree(listfields, fn)


def search(query):
    with sqlite3.connect(DBPATH) as conn:
        res = conn.execute(
            """
            select
                a.id, a.title, b.content
            from
                answers a
            join blocks b
                on a.id=b.answer_id
            """
        )

        answers = [
            {"id": a[0], "title": a[1], "content": json.loads(a[2])} for a in res
        ]
        matching_answers = []
        search_terms = query.lower().split()

        for answer in answers:

            def fulltext(node):
                """Add the value of every stringfield except 'type' to the body"""
                for key, val in node.items():
                    if isinstance(val, str) and not key == "type":
                        # inner functions have access to variables in the outer scope
                        body.append(val)

            # start with the title
            body = [answer["title"]]
            # now awkwardly-statefully add every string in the sub-blocks to it
            walk_tree(answer["content"], fulltext)
            searchbody = " ".join(body).lower()
            # We want all the search terms to show up in the body
            match = all(
                [True if term in searchbody else False for term in search_terms]
            )
            if match:
                matching_answers.append(answer)

        return matching_answers


if __name__ == "__main__":
    app.run(debug=True)
