// Authored teaching content. All result rows are captured fictional lab records.
// The entrance puzzle is a learning interaction, not access to real accounts.
export const mysqlWorkshopTutorial = {
  "title": "The MathFuel Workshop",
  "subtitle": "Love what you can make? Discover what makes it work.",
  "snapshotLabel": "The database examples contain captured fictional lab records. The shop extension uses invented scenarios. Showing an example does not query live accounts.",
  "generatedAt": "2026-11-21T13:52:41.233Z",
  "intro": [
    "Math gives us something concrete to understand. Learn to describe its facts clearly, structure records meaningfully, and retrieve an answer someone can use. Then explore how the same thinking can help someone run a small shop.",
    "Teachers, you guide the learning. MathFuel gives you more tools to work with. Explore a single step or the whole workshop when you are ready."
  ],
  "checkpoints": [
    {
      "label": "MySQL version",
      "value": "8.4.13"
    },
    {
      "label": "Migrations applied",
      "value": "5"
    },
    {
      "label": "Application tables",
      "value": "23"
    },
    {
      "label": "Live database checks",
      "value": "12 passed"
    }
  ],
  "lessons": [
    {
      "id": "behind-the-button",
      "title": "Behind the button",
      "kicker": "Start with the screen",
      "summary": "A beautiful interface becomes useful when it can remember what happened.",
      "paragraphs": [
        "You already know the visible part: a question, a box for an answer, and a button. When a learner answers 4 to 6 + ?, the browser sends a small request to the server.",
        "The server checks the signed-in learner, the saved mission, and the answer. It asks MySQL to store the next state. Only then does it return the saved result for the interface to display.",
        "A parent follows the path in the other direction: the server checks the current parent link, reads permitted records, and returns a progress summary. The browser displays the result; it does not decide who may see a child’s records.",
        "These lessons replay fictional records captured from our working lab. Showing a result here does not run SQL against a live account."
      ],
      "examples": [
        {
          "id": "one-saved-run",
          "title": "A result behind one screen",
          "sql": "SELECT studentId, missionId, status, revision\nFROM missionRuns\nWHERE id = '3bf18983-4a2b-4169-b135-e58ca9a4178c';",
          "columns": [
            "studentId",
            "missionId",
            "status",
            "revision"
          ],
          "rows": [
            [
              63,
              "bridge-ten",
              "completed",
              31
            ]
          ],
          "explanation": "This one row belongs to one learner and one mission attempt. The screen can be closed and reopened because the record lives in MySQL.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Choose a button in an app you enjoy. Describe what the screen sends, what the server checks, what should be saved, and what comes back.",
      "bullets": [
        "The interface asks and displays.",
        "The server checks and coordinates.",
        "The database stores and retrieves.",
        "A returned result updates the interface."
      ],
      "replay": [
        {
          "title": "The screen",
          "description": "The learner enters 4 for 6 + ? = 10. The browser sends the answer and the saved run’s identifiers."
        },
        {
          "title": "The server",
          "description": "The server checks the signed-in learner, confirms ownership of the run, and checks the answer and revision."
        },
        {
          "title": "The database",
          "description": "MySQL stores the accepted action and next state in a transaction. A saved row remains after the screen closes."
        },
        {
          "title": "The result returns",
          "description": "The server sends the saved result back. A linked parent can later request an authorized progress summary."
        }
      ]
    },
    {
      "id": "the-pieces",
      "title": "Meet the pieces",
      "kicker": "Know where you are",
      "summary": "An account, a database, and a spreadsheet are different things.",
      "paragraphs": [
        "MySQL is the database server. A named database is a collection of tables. A table contains rows and columns. MathFuel uses 23 application tables, plus one table that records applied migrations.",
        "The application uses a database service account. A learner signs into MathFuel. A Microsoft sign-in opens Microsoft services such as Excel and OneDrive. Those identities have different jobs.",
        "127.0.0.1 means the computer making the connection. On your laptop it means your laptop; it does not point to this authoring workspace. The lab shown here was created in an isolated development environment."
      ],
      "examples": [
        {
          "id": "database-identity",
          "title": "Ask MySQL where you are",
          "sql": "SELECT DATABASE() AS databaseName,\n       VERSION() AS mysqlVersion;",
          "columns": [
            "databaseName",
            "mysqlVersion"
          ],
          "rows": [
            [
              "mathfuel_dev_airport",
              "8.4.13"
            ]
          ],
          "explanation": "Checking the selected database before a command helps you understand which environment you are working in.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Explain the difference between the MySQL server, a named database, and a table using your own example."
    },
    {
      "id": "meaningful-records",
      "title": "What does one row mean?",
      "kicker": "Structure carries meaning",
      "summary": "Before choosing columns, decide what each record represents.",
      "paragraphs": [
        "A learner is a person. A mission run is one attempt by that person. A parent link is a relationship between two people. Those are three different kinds of record.",
        "If a learner completes five attempts, we keep one learner record and five attempt records. Each attempt carries the learner’s stable ID. We can update the learner’s name once without rewriting every attempt.",
        "The facts you preserve determine the questions you can answer. Saving only a final correct answer would lose the difference between independent work, a hint, and a corrected mistake.",
        "Good structure makes the information useful to the person who needs it: a learner continuing a mission, a teacher choosing practice, or a parent understanding progress. The same ideas apply to orders, appointments, inventories, and other systems."
      ],
      "models": [
        {
          "id": "learner",
          "title": "A learner",
          "rowMeaning": "One row represents one account, regardless of how many missions that learner attempts.",
          "fields": [
            {
              "name": "id",
              "example": "63",
              "explanation": "A stable identifier for this account."
            },
            {
              "name": "name",
              "example": "Demo Learner",
              "explanation": "A display name, which may change without changing the ID."
            },
            {
              "name": "userType",
              "example": "student",
              "explanation": "The kind of account. This is separate from an administrator role."
            },
            {
              "name": "gradeLevel",
              "example": "1",
              "explanation": "A property of the learner, stored with the learner."
            }
          ]
        },
        {
          "id": "attempt",
          "title": "A mission attempt",
          "rowMeaning": "One row represents one attempt at a mission. Many attempts can refer to the same learner.",
          "fields": [
            {
              "name": "id",
              "example": "c8aa5ed6-4fcd-4f67-9946-c294e8afe449",
              "explanation": "The identifier for this attempt, not the learner."
            },
            {
              "name": "studentId",
              "example": "63",
              "explanation": "Connects this attempt to the learner record."
            },
            {
              "name": "missionId",
              "example": "make-ten",
              "explanation": "Identifies the activity that was attempted."
            },
            {
              "name": "status",
              "example": "completed",
              "explanation": "Describes the state of this specific attempt."
            }
          ]
        },
        {
          "id": "link",
          "title": "A parent link",
          "rowMeaning": "One row represents a parent-to-learner relationship. Neither person is copied into this row.",
          "fields": [
            {
              "name": "parentId",
              "example": "67",
              "explanation": "Points to the parent account."
            },
            {
              "name": "studentId",
              "example": "63",
              "explanation": "Points to the learner account."
            },
            {
              "name": "relationship",
              "example": "parent",
              "explanation": "Describes this connection."
            }
          ]
        }
      ],
      "examples": [],
      "takeaway": "Suppose one learner makes four attempts and two parents are linked to that learner. Explain why we need one learner record, four attempt records, and two relationship records. The parent accounts also have their own user records."
    },
    {
      "id": "migrations",
      "title": "Build the tables",
      "kicker": "Structure before records",
      "summary": "A migration is a reviewed set of SQL changes to the database structure.",
      "paragraphs": [
        "We applied five migrations from the current Drizzle journal. They created the current base tables, added feedback and password storage, created invite/reset tables, and added missionRuns.",
        "The repository also contains 25 SQL files from a different history. They are not additional steps for this setup. Running every SQL file would mix conflicting definitions. The journal identifies the intended sequence.",
        "Creating a table does not fill it with content. The two missions generate their own problems. The older general practice area has a separate content-seeding requirement."
      ],
      "examples": [
        {
          "id": "migration-history",
          "title": "See the applied migration records",
          "sql": "SELECT id, created_at\nFROM __drizzle_migrations\nORDER BY created_at;",
          "columns": [
            "id",
            "created_at"
          ],
          "rows": [
            [
              1,
              1774076552738
            ],
            [
              2,
              1774117435963
            ],
            [
              3,
              1774124354228
            ],
            [
              4,
              1774127171048
            ],
            [
              5,
              1795266829043
            ]
          ],
          "explanation": "The created_at values are migration ordering markers. Their hashes were also checked against the source files in the live verification.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Find drizzle/meta/_journal.json and count its five entries. Explain why generating a migration and applying a migration are separate actions.",
      "bullets": [
        "0000: 19 base tables.",
        "0001: feedback table.",
        "0002: password-hash column.",
        "0003: invite and reset tables.",
        "0004: saved mission runs."
      ]
    },
    {
      "id": "relationships",
      "title": "Connect the people",
      "kicker": "Rows become relationships",
      "summary": "Stable IDs let us connect records without copying an entire person into every table.",
      "paragraphs": [
        "The fictional learner’s ID is 63; the fictional parent’s ID is 67. These are identifiers, not spreadsheet row numbers. Gaps between IDs do not mean that rows are missing.",
        "users stores accounts. parentStudentLinks records the parentId and studentId that connect two accounts. missionRuns uses studentId to identify the owner of each attempt.",
        "In this version, these relationships are checked by application code; the schema does not declare foreign-key constraints. Naming a column studentId does not itself make MySQL verify that the referenced user exists. That distinction matters when designing later migrations."
      ],
      "examples": [
        {
          "id": "people",
          "title": "Read the two fictional accounts",
          "sql": "SELECT id, name, userType, gradeLevel\nFROM users\nWHERE id IN (63, 67)\nORDER BY id;",
          "columns": [
            "id",
            "name",
            "userType",
            "gradeLevel"
          ],
          "rows": [
            [
              63,
              "Demo Learner",
              "student",
              1
            ],
            [
              67,
              "Demo Parent",
              "parent",
              null
            ]
          ],
          "explanation": "SELECT chooses columns. FROM chooses the table. WHERE narrows the rows. ORDER BY makes their order explicit.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        },
        {
          "id": "parent-join",
          "title": "Join the parent to the learner",
          "sql": "SELECT parent.name AS parent_name,\n       learner.name AS learner_name,\n       link.relationship\nFROM parentStudentLinks AS link\nJOIN users AS parent ON parent.id = link.parentId\nJOIN users AS learner ON learner.id = link.studentId\nWHERE link.parentId = 67 AND link.studentId = 63;",
          "columns": [
            "parent_name",
            "learner_name",
            "relationship"
          ],
          "rows": [
            [
              "Demo Parent",
              "Demo Learner",
              "parent"
            ]
          ],
          "explanation": "The query uses users twice, with two aliases. Each alias tells us which role that row plays in the relationship.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Find the same learner ID in Users, Parent Links, and Mission Runs. Then explain what a JOIN adds to a plain SELECT."
    },
    {
      "id": "save-and-return",
      "title": "Save it. Bring it back.",
      "kicker": "Follow the evidence",
      "summary": "A completed activity and an independent answer are different measures.",
      "paragraphs": [
        "We registered fictional accounts through the running HTTP application, linked the parent with an invite code, completed both missions, and read the same saved results back through the parent’s session.",
        "Make Ten used one hint: 4 of 5 problems were independent, while all 5 were correct on the first answer. Bridge Through Ten included one wrong answer that was corrected:4 of 5 were independent and 4 of 5 were first tries.",
        "A third Make Ten run is still in progress. Its saved hint and revision exist, but its final summary is blank. A blank completion result is not a zero score.",
        "The final counts are calculated by the application from the saved JSON step history. They are not separate editable score columns in missionRuns."
      ],
      "examples": [
        {
          "id": "run-history",
          "title": "Read the saved attempts",
          "sql": "SELECT id, missionId, status, revision\nFROM missionRuns\nWHERE studentId = 63\nORDER BY createdAt, id;",
          "columns": [
            "id",
            "missionId",
            "status",
            "revision"
          ],
          "rows": [
            [
              "3bf18983-4a2b-4169-b135-e58ca9a4178c",
              "bridge-ten",
              "completed",
              31
            ],
            [
              "c8aa5ed6-4fcd-4f67-9946-c294e8afe449",
              "make-ten",
              "completed",
              11
            ],
            [
              "b07be913-d00d-4b51-93af-ea9772c05063",
              "make-ten",
              "in_progress",
              1
            ]
          ],
          "explanation": "The same run ID survives a reload. The revision records accepted changes. Completed and in-progress runs remain separate records.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Use the Excel workbook to explain why a hinted correct answer can count as first try while not counting as independent."
    },
    {
      "id": "reliable-saves",
      "title": "What if you click twice?",
      "kicker": "Protect the saved record",
      "summary": "Real applications have retries, multiple tabs, and requests that arrive together.",
      "paragraphs": [
        "A unique activeKey lets a learner have one active attempt for a given mission. Starting again returns that attempt. Completing it clears the active key so another attempt can begin.",
        "A transaction groups the update. A row lock makes competing updates wait for the same record. A revision check rejects a request based on an older state. An action ID lets the server recognize a retry of the same request.",
        "Our live test used separate processes and MySQL connections. It placed competing requests behind an actual row lock, then verified that one update succeeded and the stale update was rejected. It also verified that a repeated hint request did not count twice.",
        "Account access remains a separate check. Another learner cannot read the run, and removing a parent link prevents later reads, even with an existing parent session."
      ],
      "examples": [
        {
          "id": "run-counts",
          "title": "Count saved attempts by status",
          "sql": "SELECT missionId, status, COUNT(*) AS runCount\nFROM missionRuns\nWHERE studentId = 63\nGROUP BY missionId, status\nORDER BY CAST(missionId AS CHAR), CAST(status AS CHAR);",
          "columns": [
            "missionId",
            "status",
            "runCount"
          ],
          "rows": [
            [
              "bridge-ten",
              "completed",
              1
            ],
            [
              "make-ten",
              "completed",
              1
            ],
            [
              "make-ten",
              "in_progress",
              1
            ]
          ],
          "explanation": "COUNT measures saved runs here. It does not count unique learners or prove mastery.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Describe two different problems: the same request arrives twice, and two different requests use the same old revision. Why do they need different checks?"
    },
    {
      "id": "time-is-data",
      "title": "Time is data, too",
      "kicker": "Learn from the bugs",
      "summary": "The database tests found two timestamp problems that simpler tests missed.",
      "paragraphs": [
        "First, the original completion response contained milliseconds, while the database’s TIMESTAMP column stored whole seconds. Reading the saved row inside the transaction made the original response and later reloads agree.",
        "Second, Drizzle wrote UTC timestamp strings into a MySQL session using Central time. A direct epoch check revealed completions six hours in the future. Matching repeated display strings had not been enough to detect that error.",
        "Every application database connection now sets its session time zone to UTC before it can run application queries. We left the server’s system zone at CST during verification, so the fix had to work despite that difference.",
        "The final test compares raw MySQL epochs with the real action interval and checks creation-before-completion. The export also rejects future or reversed timestamps. Excel can then display the same moment in America/Chicago with an explicit label."
      ],
      "examples": [
        {
          "id": "timestamp-epochs",
          "title": "Inspect the actual stored moments",
          "sql": "SELECT missionId,\n       UNIX_TIMESTAMP(createdAt) AS createdEpoch,\n       UNIX_TIMESTAMP(completedAt) AS completedEpoch\nFROM missionRuns\nWHERE studentId = 63 AND status = 'completed'\nORDER BY createdAt, id;",
          "columns": [
            "missionId",
            "createdEpoch",
            "completedEpoch"
          ],
          "rows": [
            [
              "bridge-ten",
              1795269103,
              1795269104
            ],
            [
              "make-ten",
              1795269103,
              1795269104
            ]
          ],
          "explanation": "An epoch is a numeric representation of an instant. The columns can be compared without mistaking a local clock label for UTC.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Compare a saved timestamp with the action that produced it. Explain why consistent formatting alone does not prove the stored moment is correct."
    },
    {
      "id": "excel-and-next",
      "title": "Bring it into Excel",
      "kicker": "Explore when you are ready",
      "summary": "A familiar spreadsheet can help you understand an unfamiliar database.",
      "paragraphs": [
        "Start with a snapshot: named columns and a few fictional rows. Excel lets you trace IDs, filter attempts, and calculate a small report. Changing a cell in a snapshot does not change the application.",
        "A supported Power Query MySQL connector can import refreshed results from a reachable database. Microsoft sign-in opens Microsoft services; the database connection uses separate MySQL credentials. A laptop’s localhost database is not automatically reachable by Excel for the web.",
        "Connector and driver availability depend on the Excel edition and host. Microsoft’s current Excel import guidance points missing components to MySQL ODBC; the shared Power Query documentation discusses Connector/NET for Power BI and gateways. Use the requirements for the actual Excel build.",
        "Write-back add-ins are a different workflow. Direct database edits do not pass through the application’s scoring and authorization code. Begin by understanding what you are reading, then design any later editing workflow around the rules it must preserve.",
        "Teachers, you guide the learning. MathFuel gives you more tools to work with. Choose a single example, explore the whole workshop, or return when it fits your class. Curiosity sets the pace."
      ],
      "examples": [
        {
          "id": "excel-report",
          "title": "A small report ready for a spreadsheet",
          "sql": "SELECT missionId, status, COUNT(*) AS runCount\nFROM missionRuns\nWHERE studentId = 63\nGROUP BY missionId, status\nORDER BY CAST(missionId AS CHAR), CAST(status AS CHAR);",
          "columns": [
            "missionId",
            "status",
            "runCount"
          ],
          "rows": [
            [
              "bridge-ten",
              "completed",
              1
            ],
            [
              "make-ten",
              "completed",
              1
            ],
            [
              "make-ten",
              "in_progress",
              1
            ]
          ],
          "explanation": "Download these captured rows as CSV if that control is available, then open them in Excel. This is a teaching snapshot, not a live database connection.",
          "capturedAt": "2026-11-21T13:52:41.233Z"
        }
      ],
      "takeaway": "Open the example in Excel. Put missionId in PivotTable rows, status in columns, and the sum of runCount in values. Tell someone what each number counts."
    },
    {
      "id": "ten-visitors",
      "title": "Ten visitors. What happens next?",
      "kicker": "An optional next adventure",
      "summary": "Use arithmetic, meaningful records, and curiosity about people to understand a small T-shirt shop.",
      "paragraphs": [
        "Imagine ten fictional visitors entering your shop. Four buy one T-shirt each. Six leave without buying. We can count what happened, then ask a useful question: what might we change, and what evidence would help us choose?",
        "Visitors, buyers, and shirts are different things. Four of ten visitors bought something: 40%. In this first exercise, each buyer buys one shirt, so there are also four units sold. Later, a customer who buys two shirts will make those counts differ.",
        "Suppose the price is $15 and the variable cost is $4 per shirt sold. Four sales produce $60 in revenue and $16 in variable costs, leaving $44 toward fixed costs and profit. The $44 is contribution, not net profit. Inventory purchases and cash remaining are separate questions.",
        "A sale records a choice, not everything inside a customer’s mind. Someone might need another size, prefer another design, have a different budget, or simply be browsing. Preserve what was observed or said; label your explanations as hypotheses until you have evidence.",
        "The data model matters here. A record for every fictional visit preserves the ten-person denominator. Sale lines record the product, quantity, actual sale price, and cost at that time. Offers and optional feedback preserve what a visitor saw or said. If we record only successful sales, we cannot recover how many people visited without buying.",
        "This is a proposed classroom simulation using invented outcomes, separate from the captured MySQL lab. It does not run a store or predict how real customers will behave. Teachers can begin with counting and add money, percentages, customer choices, and careful comparisons when learners are ready."
      ],
      "bullets": [
        "Scenario A: price $10, six buyers, one shirt each, $4 cost per shirt sold. Revenue: $60. Contribution: $36.",
        "Scenario B: price $15, four buyers, one shirt each, $4 cost per shirt sold. Revenue: $60. Contribution: $44.",
        "Scenario C: price $20, two buyers, one shirt each, $4 cost per shirt sold. Revenue: $40. Contribution: $32.",
        "Each scenario assumes ten visits and enough stock. These invented buyer counts demonstrate arithmetic; they do not establish a demand curve, a causal price effect, or the best real-world price.",
        "Ask what you want to improve: units sold, contribution, customer satisfaction, or another clearly defined goal. Then decide what records would let you evaluate it."
      ],
      "examples": [],
      "takeaway": "Draw ten visit records and four one-shirt sales. Calculate visitors, buyers, units, revenue, and contribution. Then suggest one explanation for a non-purchase and one piece of evidence that could help you check it."
    }
  ]
};
