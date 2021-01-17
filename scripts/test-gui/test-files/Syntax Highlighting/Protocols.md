# Protocol Languages Syntax Highlighting

This file includes the protocol language syntax highlighting supported by Zettlr.

## JSON

```json
[
  {
    "title": "apples",
    "count": [12000, 20000],
    "description": {"text": "...", "sensitive": false}
  },
  {
    "title": "oranges",
    "count": [17500, null],
    "description": {"text": "...", "sensitive": false}
  }
]
```

## SQL

```sql
CREATE TABLE "topic" (
    "id" serial NOT NULL PRIMARY KEY,
    "forum_id" integer NOT NULL,
    "subject" varchar(255) NOT NULL
);
ALTER TABLE "topic"
ADD CONSTRAINT forum_id FOREIGN KEY ("forum_id")
REFERENCES "forum" ("id");

-- Initials
insert into "topic" ("forum_id", "subject")
values (2, 'D''artagnian');
```


## Turtle

```turtle
 @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
 @prefix dc: <http://purl.org/dc/elements/1.1/> .
 @prefix ex: <http://example.org/stuff/1.0/> .

 <http://www.w3.org/TR/rdf-syntax-grammar>
   dc:title "RDF/XML Syntax Specification (Revised)" ;
   ex:editor [
     ex:fullname "Dave Beckett";
     ex:homePage <http://purl.org/net/dajobe/>
   ] .
```

## SparQL

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?name
       ?email
WHERE
  {
    ?person  a          foaf:Person .
    ?person  foaf:name  ?name .
    ?person  foaf:mbox  ?email .
  }
```
