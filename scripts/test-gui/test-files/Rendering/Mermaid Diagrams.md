---
title: mermaid cheat sheet
id: 20210712134645
keywords:
  - 🌱
---
codeblock for reference
```

```

# general
- the diagrams should be simple and readable, i.e. don't use too many shades, transparency, etc. and aim for high contrast
- a background color is necessary to show the extend of the diagram
- shape borders are necessary for some shapes, which means we'll use them for all shapes but set fill-color to background color
- the primary theme color will be used for highlighting

# graphs and flowcharts
graph:
```mermaid
graph TD
    a(system);
    b(continuous model) -- logical abstraction --> c(causal DES model);
    a -- physical analysis --> b;
    a -- qualitative analysis --> c;
    d(timed DES model);
    b -- logical, temporal abstraction --> d;
    c -- temporal analysis --> d;
```

flowchart with nested subgraphs:
```mermaid
flowchart LR
a([input image]) --> b[CNN backbone] --> c[FPN neck] --> d1[RPN] & d2[ROI pool]
d1 --> d2 --> d3(( )) --> e1[shared head] --> e2(( )) --> f1[class head] & f2[bbox head]
f1 --> l1([class loss])
f2 --> l2([bbox loss])
subgraph GPA 1
    subgraph process
        g1a[fc layer] --> g1b[graph] --> g1c[prototypes] 
    end
    g1c --> g1d1([intra-class loss]) & g1d2([inter-class loss])
end
subgraph GPA 2
    g2a[process] --> g2d1([intra-class loss]) & g2d2([inter-class loss])
end
d3 --> g1a
e2 --> g2a
```
all shapes (flowchart, same as graph):
```mermaid
flowchart LR
    a(a) --> b([b]) --> c[[c]] --> d[(d)] --> e((e)) --> f>f] --> g{g} --> h{{h}}
    h --> i[/i/] --> j[\j\] --> k[/k\] --> l[\l/]
    m( ) --- n( ) <--> o( ) --o p( ) --x q( ) -.-> r( ) ==> s( )
```

# sequence diagram
`-)` and `--)` arrow types will be available with newest mermaid version

```mermaid
sequenceDiagram
    Alice->>John: this is a message
    activate John
    John-->>Alice: and this is an answer
    deactivate John
    John->>+Bob: messages
    John->>+Bob: can be
    John->>+Bob: nested
    Bob-->>-John: and
    Bob-->>-John: answers
    Bob-->>-John: aswell
    loop Every minute
        Alice->>Alice: messages can loop
    end    
    Note right of Alice: notes can be added anywhere
    Note over John,Bob: or overlaid 
    alt normal lines
        Alice->>John: with arrow
        Alice->Bob: without arrow
        John-xBob: terminator 
    else dashed lines
        Alice-->>John: with arrow
        Alice-->Bob: without arrow
        John--xBob: terminator
    end
```

# pie chart
```mermaid
pie title Commits to mxgraph2 on GitHub
    "there can" : 1
    "be up to" : 2
    "12 colors" : 3
    "in a chart" : 4
    "---" : 5
    "the position" : 6
    "of the labels" : 7
    "in the chart" : 8
    "can sadly" : 9
    "not be" : 10
    "adjusted" : 11
    "===" : 12
```
# class diagram
```mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal "1" <|-- "1..*" Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        <<interface>>
        +String beakColor
        +swim()
        +quack(List~string~ quack_words)
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }
```

```mermaid
classDiagram
    classA <|-- classB : Inheritance
    classC *-- classD : Composition
    classE o-- classF
    classG <-- classH
    classI -- classJ
    classK <.. classL
    classM <|.. classN
    classO .. classP
```

# state diagram
```mermaid
stateDiagram-v2
    [*] --> normal_state
    note right of normal_state: this is a simple note
    state fork_state <<fork>>
    normal_state --> fork_state
    state "state with description" as descr
    note left of descr
        this is a note
        with multiple lines
    end note
    state concurrency {
        [*] --> these
        these--> [*]
        --
        [*] --> happen
        happen --> simultanously
        simultanously --> happen
    }
    state composite {
        [*] --> states
        state states {
            [*] --> nested
            state nested {
                [*] --> deeply
                state deeply
                deeply --> [*]
            }
            nested --> [*]
        }
        states --> [*]
    }
    fork_state --> descr
    descr --> composite
    fork_state --> concurrency
    state join_state <<join>>
    composite --> join_state
    concurrency --> join_state
    state if_state <<choice>>
    join_state --> if_state: this is a transition label
    if_state --> if_state: not ready? try again
    if_state --> [*]: ready? end
```
# entity relationship diagram
```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
        string custNumber
        string sector
    } ORDER ||--|{ LINE-ITEM : contains
    ORDER {
        int orderNumber
        string deliveryAddress
    }
    LINE-ITEM {
        string productCode
        int quantity
        float pricePerUnit
    }
    CUSTOMER }|..o{ DELIVERY-ADDRESS : uses
```

# user journey diagram
```mermaid
journey
    title my working day
    section go to work
        make tea: 5: me
        go upstairs: 3: me
        do work: 1: me, cat
    section go home
        go downstairs: 2: me
        sit down: 4: me
```

# gantt chart
```mermaid
gantt
    dateFormat YYYY-MM-DD
    title GANTT chart
    excludes weekends
    
    section normal tasks
    completed task: done, des1, 2014-01-06, 2014-01-08
    active task: active, des2, 2014-01-09, 1d
    future task: des3, after des2, 2d
    future task2: des4, after des3, 2d
    
    section critical tasks
    completed task: crit, done, 2014-01-06, 24h
    completed task2: crit, done, after des1, 1d
    active task: crit, active, 1d
    future task: crit, 3d
    non-critical: 2d
    non-critical2: 1d
    
    section another section
    active task: active, a1, after des1, 2d
    future task: after a1, 20h
    future task2: doc1, after a1, 48h
    
    section yet another section
    active task: active, b1, after des1, 2d
    future task: after b1, 20h
    future task2: doc2, after b1, 48h
    
    section ... and another one
    active task: active, c1, after des1, 2d
    future task: after c1, 20h
    future task2: doc3, after c1, 48h
```
# requirement diagram
Will come in the next version.

```mermaid
requirementDiagram
    requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
    }

    functionalRequirement test_req2 {
    id: 1.1
    text: the second test text.
    risk: low
    verifymethod: inspection
    }

    performanceRequirement test_req3 {
    id: 1.2
    text: the third test text.
    risk: medium
    verifymethod: demonstration
    }

    interfaceRequirement test_req4 {
    id: 1.2.1
    text: the fourth test text.
    risk: medium
    verifymethod: analysis
    }

    physicalRequirement test_req5 {
    id: 1.2.2
    text: the fifth test text.
    risk: medium
    verifymethod: analysis
    }

    designConstraint test_req6 {
    id: 1.2.3
    text: the sixth test text.
    risk: medium
    verifymethod: analysis
    }

    element test_entity {
    type: simulation
    }

    element test_entity2 {
    type: word doc
    docRef: reqs/test_entity
    }

    element test_entity3 {
    type: "test suite"
    docRef: github.com/all_the_tests
    }


    test_entity - satisfies -> test_req2
    test_req - traces -> test_req2
    test_req - contains -> test_req3
    test_req3 - contains -> test_req4
    test_req4 - derives -> test_req5
    test_req5 - refines -> test_req6
    test_entity3 - verifies -> test_req5
    test_req <- copies - test_entity2
```

# custom styling
Custom styling can still be applied with element-specific commands

```mermaid
graph LR
    id1(Start)-->id2(Stop)
    style id1 fill:#f9f,stroke:#333,stroke-width:4px
    style id2 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
```

or by overwriting theme-variables in the first line of the chart using

```
%%{init: {'securityLevel': 'loose', 'theme':'base'}}%%
```

___

- [[20210202143705]] Zettlr
