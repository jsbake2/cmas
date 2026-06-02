#!/usr/bin/env python3
"""One-shot authoring script: appends 8 new passages + items and wires them
into new units (g6-u3 for Olive, g4-u3 for Fox). Idempotent-ish: refuses to
run twice by checking for a sentinel passage id."""
import json
import sys

PATH = "cmas-content.json"

with open(PATH) as f:
    data = json.load(f)

existing_pids = {p["id"] for p in data["passages"]}
if "g6-labrador-retriever" in existing_pids:
    print("Already added; aborting to avoid duplicates.")
    sys.exit(1)

passages = []
items = []
# section specs: (form_id, unit_id, unit_title, [(passage_id, [item_ids...])])
g6_sections = []
g4_sections = []


def mc(item_id, pid, skill, stem, options, correct, rationale):
    items.append({
        "id": item_id, "type": "multiple_choice", "passageIds": [pid],
        "skill": skill, "stem": stem,
        "options": [{"id": k, "text": v} for k, v in options],
        "correct": correct, "rationale": rationale,
    })
    return item_id


def msel(item_id, pid, skill, stem, options, correct, rationale):
    items.append({
        "id": item_id, "type": "multiple_select", "passageIds": [pid],
        "skill": skill, "stem": stem,
        "options": [{"id": k, "text": v} for k, v in options],
        "correct": correct, "rationale": rationale,
    })
    return item_id


def ebsr(item_id, pid, skill, a_stem, a_opts, a_correct, b_stem, b_opts, b_correct, rationale):
    items.append({
        "id": item_id, "type": "two_part_ebsr", "passageIds": [pid], "skill": skill,
        "partA": {"stem": a_stem, "options": [{"id": k, "text": v} for k, v in a_opts], "correct": a_correct},
        "partB": {"stem": b_stem, "options": [{"id": k, "text": v} for k, v in b_opts], "correct": b_correct},
        "rationale": rationale,
    })
    return item_id


def evsel(item_id, pid, skill, stem, scope, correct, rationale):
    items.append({
        "id": item_id, "type": "evidence_select", "passageIds": [pid], "skill": skill,
        "stem": stem, "paragraphScope": scope, "correct": correct, "rationale": rationale,
    })
    return item_id


def order(item_id, pid, skill, stem, elements, correct_order, rationale):
    items.append({
        "id": item_id, "type": "order", "passageIds": [pid], "skill": skill, "stem": stem,
        "elements": [{"id": k, "text": v} for k, v in elements],
        "correctOrder": correct_order, "rationale": rationale,
    })
    return item_id


def dropdown(item_id, pid, skill, stem, blanks, rationale):
    items.append({
        "id": item_id, "type": "inline_dropdown", "passageIds": [pid], "skill": skill,
        "stem": stem,
        "blanks": {bid: {"options": [{"id": k, "text": v} for k, v in opts], "correct": c}
                   for bid, (opts, c) in blanks.items()},
        "rationale": rationale,
    })
    return item_id


def short(item_id, pid, skill, stem, require_citation, rubric_max, sample):
    items.append({
        "id": item_id, "type": "short_response", "passageIds": [pid], "skill": skill,
        "stem": stem, "requireCitation": require_citation, "rubricMax": rubric_max,
        "sampleAnswer": sample,
    })
    return item_id


def prose(item_id, pid, skill, stem, task_type, require_citation, word_hint, rubric):
    items.append({
        "id": item_id, "type": "prose_response", "passageIds": [pid], "skill": skill,
        "stem": stem, "taskType": task_type, "requireCitation": require_citation,
        "wordCountHint": word_hint, "rubricMax": 4, "rubric": rubric, "sampleResponse": None,
    })
    return item_id


RUBRIC_INFO = [
    "Clearly addresses the prompt with a main idea or claim",
    "Includes specific details from the passage, with the paragraph cited",
    "Organized and easy to follow, in the writer's own words",
    "Few errors in spelling, grammar, and punctuation",
]
RUBRIC_NARR = [
    "Clearly addresses the prompt with a main idea or claim",
    "Develops the response with specific details and a clear sequence",
    "Organized and easy to follow, in the writer's own words",
    "Few errors in spelling, grammar, and punctuation",
]


# ============================================================ OLIVE (G6)
# --- Quiz: The Real Home of the Labrador Retriever
pid = "g6-labrador-retriever"
passages.append({
    "id": pid, "title": "The Real Home of the Labrador Retriever",
    "kind": "informational", "genre": "History of science",
    "grade": 6,
    "paragraphs": [
        "The Labrador retriever is one of the most popular dogs in the world, but its name hides a surprising fact. The breed did not actually come from Labrador. It came from the island of Newfoundland, off the eastern coast of Canada, where it began as a hardworking fishing dog.",
        "In the seventeenth and eighteenth centuries, fishing families on Newfoundland kept a sturdy animal called the St. John's water dog. These dogs spent their days in freezing water, hauling in nets, towing ropes, and fetching fish that slipped off the hooks. A thick, oily double coat kept them warm, and webbed feet helped them paddle like little boats.",
        "British visitors who sailed to Newfoundland noticed how tireless and obedient these dogs were. Beginning in the early eighteen hundreds, English nobles brought some of the dogs home across the ocean. One of them, the Earl of Malmesbury, admired the animals so much that he started a kennel and called them Labrador dogs, borrowing the name of the nearby region.",
        "In England the breeders shaped the dog we know today. They prized its gentle mouth, its eagerness to please, and its love of water. The breed nearly disappeared in Canada because of heavy dog taxes and strict laws, so the carefully kept English dogs became the foundation of the modern Labrador.",
        "Today Labradors do far more than fetch fish. They guide people who cannot see, search for missing hikers, sniff out danger, and curl up beside families as faithful pets. The breed traveled a long way from a cold Newfoundland harbor, but it never lost the steady, willing nature that made fishermen depend on it.",
    ],
})
g6_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Central idea",
       "Which sentence best states the central idea of the passage?",
       [("A", "Labrador retrievers were first bred in England by wealthy nobles purely for hunting birds"),
        ("B", "Despite its name, the Labrador retriever began as a fishing dog in Newfoundland"),
        ("C", "Most popular dog breeds in the world come from islands near Canada"),
        ("D", "The St. John's water dog had a thick coat and webbed feet for swimming")],
       "B",
       "The whole passage traces the breed from Newfoundland to its modern roles."),
    mc(f"{pid}-q2", pid, "Key detail",
       "According to the passage, why was the breed renamed by the Earl of Malmesbury?",
       [("A", "He borrowed the name of the nearby region of Labrador"),
        ("B", "The dogs were first discovered living in the region of Labrador"),
        ("C", "Fishermen in Newfoundland asked him to rename them"),
        ("D", "The dogs were better at fishing than at retrieving")],
       "A",
       "Paragraph 3 says he called them Labrador dogs after the nearby region."),
    mc(f"{pid}-q3", pid, "Vocabulary in context",
       "In paragraph 2, the word \"tireless\" most nearly means",
       [("A", "needing a great deal of rest after a short time"),
        ("B", "able to keep working without tiring"),
        ("C", "clumsy and slow while moving in the water"),
        ("D", "friendly toward strangers")],
       "B",
       "The dogs worked all day in freezing water, so tireless means not getting tired."),
    msel(f"{pid}-msel", pid, "Key details (multi-select)",
         "Select the TWO traits the passage says helped the St. John's water dog work in cold water.",
         [("A", "A thick, oily double coat"),
          ("B", "Webbed feet for paddling"),
          ("C", "A loud bark to warn the boats"),
          ("D", "An unusually long tail for steering"),
          ("E", "Sharp claws for climbing rocks")],
         ["A", "B"],
         "Paragraph 2 names the oily double coat and webbed feet."),
    evsel(f"{pid}-evsel", pid, "Cite the evidence",
          "Click the sentence that explains why the breed nearly died out in Canada.",
          4,
          ["The breed nearly disappeared in Canada because of heavy dog taxes and strict laws, so the carefully kept English dogs became the foundation of the modern Labrador."],
          "This sentence names the taxes and laws that nearly ended the breed in Canada."),
    short(f"{pid}-short", pid, "Cite textual evidence",
          "Why is it surprising that the breed is called the \"Labrador\" retriever? Use a detail from the passage and name the paragraph.",
          True, 2,
          "The breed did not come from Labrador at all; it came from the island of Newfoundland, where it worked as a fishing dog (paragraph 1)."),
    prose(f"{pid}-write", pid, "Written response",
          "Using the passage, explain how a Newfoundland fishing dog became the modern Labrador retriever. Use at least two details and name the paragraph for each.",
          "research_simulation", True, 130, RUBRIC_INFO),
]))

# --- Quiz: Building the Constitution
pid = "g6-constitution"
passages.append({
    "id": pid, "title": "Building the Constitution",
    "kind": "informational", "genre": "American history",
    "grade": 6,
    "paragraphs": [
        "In the summer of 1787, fifty-five men gathered in a hot brick building in Philadelphia. They came from twelve of the thirteen states, and they had a serious problem to solve. The young country was held together by a set of rules called the Articles of Confederation, but those rules left the national government far too weak to do its job.",
        "Under the Articles, the states acted almost like separate countries. The government could not collect taxes well, settle quarrels between states, or pay the soldiers who had won the war for independence. Many leaders feared the new nation would simply fall apart unless something changed.",
        "The delegates met in secret so they could argue freely. They kept the windows shut against listening crowds, even in the summer heat. James Madison took careful notes every day and offered so many ideas that he is often called the Father of the Constitution.",
        "The biggest fight was over how many votes each state should get in the new government. Large states wanted votes based on population, while small states wanted every state to count the same. The answer was the Great Compromise, which created two houses of Congress: one based on population and one that gave every state an equal voice.",
        "On September 17, 1787, the delegates signed the finished plan. The work was not over, because nine of the thirteen states still had to approve it. After fierce debate, they did, and the Constitution became the framework that still guides the nation today.",
    ],
})
g6_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Central idea",
       "What is the passage mainly about?",
       [("A", "How one unusually hot summer in Philadelphia changed the local weather"),
        ("B", "How delegates wrote the Constitution to fix a weak government"),
        ("C", "How James Madison won the war for independence"),
        ("D", "How the thirteen states became separate countries")],
       "B",
       "The passage traces the writing of the Constitution to replace the weak Articles."),
    mc(f"{pid}-q2", pid, "Cause and effect",
       "According to the passage, why did the delegates meet to change the rules?",
       [("A", "The Articles of Confederation made the government too weak"),
        ("B", "The states wanted to declare war on one another right away"),
        ("C", "James Madison ordered all of the states to gather quickly"),
        ("D", "Philadelphia was the only large city with a building big enough")],
       "A",
       "Paragraphs 1 and 2 explain the Articles left the government too weak."),
    mc(f"{pid}-q3", pid, "Vocabulary in context",
       "In paragraph 4, the word \"compromise\" most nearly means",
       [("A", "a complete and total victory for just one side"),
        ("B", "an agreement where each side gives a little"),
        ("C", "a vote that is taken in secret"),
        ("D", "a refusal to change any of the rules")],
       "B",
       "The Great Compromise gave each side part of what it wanted."),
    order(f"{pid}-order", pid, "Sequence",
          "Put the events from the passage in the order they happened.",
          [("s1", "States struggle under the weak Articles of Confederation."),
           ("s2", "Fifty-five delegates gather in Philadelphia in 1787."),
           ("s3", "Delegates argue and reach the Great Compromise."),
           ("s4", "The delegates sign the finished Constitution."),
           ("s5", "Nine states approve it and it becomes law.")],
          ["s1", "s2", "s3", "s4", "s5"],
          "This is the order described from paragraph 1 through paragraph 5."),
    dropdown(f"{pid}-cloze", pid, "Inference (inline choice)",
             "Choose the words that best complete the sentence. The Great Compromise settled the fight by giving large states {{b1}} and giving small states {{b2}}.",
             {
                 "b1": ([("A", "more votes based on population"), ("B", "control of the army")], "A"),
                 "b2": ([("A", "an equal voice in one house"), ("B", "the right to leave the country")], "A"),
             },
             "Paragraph 4 explains the two houses balanced population and equal votes."),
    short(f"{pid}-short", pid, "Cite textual evidence",
          "Why did the delegates keep their meetings secret? Use a detail from the passage and name the paragraph.",
          True, 2,
          "They met in secret and shut the windows so they could argue freely without listening crowds (paragraph 3)."),
    prose(f"{pid}-write", pid, "Written response",
          "Using the passage, explain why the Great Compromise was so important to finishing the Constitution. Use at least two details and name the paragraph for each.",
          "research_simulation", True, 130, RUBRIC_INFO),
]))

# --- Quiz: Sally Ride Reaches for Space
pid = "g6-sally-ride"
passages.append({
    "id": pid, "title": "Sally Ride Reaches for Space",
    "kind": "informational", "genre": "Biography",
    "grade": 6,
    "paragraphs": [
        "Sally Ride grew up loving two very different things: science and sports. She was a talented tennis player who once thought about turning professional, but her curiosity about how the universe worked pulled her toward physics instead. She earned advanced degrees at Stanford University and spent her days studying stars and lasers.",
        "One morning in 1977 she opened the student newspaper and saw an announcement that changed her life. The National Aeronautics and Space Administration, known as NASA, was looking for new astronauts, and for the first time it was inviting women to apply. Out of more than eight thousand applicants, Ride was one of only six women chosen.",
        "On June 18, 1983, she rode the space shuttle Challenger into orbit and became the first American woman in space. She was thirty-two years old. During the mission she operated a robotic arm she had helped design, using it to release and recover satellites high above the Earth.",
        "The attention was not always kind. Reporters asked her silly questions they never asked male astronauts, such as whether spaceflight would damage her health or make her cry. Ride answered calmly and kept the focus on her work, letting her skill speak for itself.",
        "After leaving NASA, Ride became a professor and started a company to help young people, especially girls, get excited about science. She wanted them to know that the doors she had pushed open would stay open for them. Sally Ride died in 2012, but the path she cleared still leads upward.",
    ],
})
g6_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Central idea",
       "Which statement best describes the central idea of the passage?",
       [("A", "Sally Ride always preferred playing tennis to studying any science"),
        ("B", "Sally Ride broke barriers as the first American woman in space"),
        ("C", "Reporters asked astronauts many difficult science questions"),
        ("D", "NASA chose eight thousand new astronauts in the year 1977")],
       "B",
       "The passage centers on Ride breaking barriers and opening doors for girls."),
    mc(f"{pid}-q2", pid, "Key detail",
       "What did Sally Ride do during her 1983 mission?",
       [("A", "She designed a brand-new space shuttle by herself"),
        ("B", "She operated a robotic arm to release satellites"),
        ("C", "She trained the other five women astronauts"),
        ("D", "She wrote articles for the student newspaper")],
       "B",
       "Paragraph 3 says she operated a robotic arm to release and recover satellites."),
    mc(f"{pid}-q3", pid, "Author's purpose",
       "Why does the author include the reporters' questions in paragraph 4?",
       [("A", "To show the unfair treatment Ride faced and how she handled it"),
        ("B", "To prove that spaceflight is truly dangerous for a person's health"),
        ("C", "To explain how a robotic arm releases a satellite while in orbit"),
        ("D", "To describe the training that all new astronauts must complete")],
       "A",
       "The questions show unfair treatment, and Ride stayed focused on her work."),
    ebsr(f"{pid}-ebsr", pid, "Cite the evidence (EBSR)",
         "Part A: What helped Sally Ride become an astronaut?",
         [("A", "Her fame as a tennis player"),
          ("B", "A NASA notice in a newspaper"),
          ("C", "An offer from a satellite company"),
          ("D", "A letter from another astronaut")],
         "B",
         "Part B: Which sentence best supports your answer to Part A?",
         [("A", "She was a talented tennis player who once thought about turning professional, but her curiosity about how the universe worked pulled her toward physics instead."),
          ("B", "One morning in 1977 she opened the student newspaper and saw an announcement that changed her life."),
          ("C", "She was thirty-two years old."),
          ("D", "Sally Ride died in 2012, but the path she cleared still leads upward.")],
         "B",
         "The newspaper announcement is what led her to apply to NASA."),
    evsel(f"{pid}-evsel", pid, "Cite the evidence",
          "Click the sentence that shows Ride wanted to help other girls follow her.",
          5,
          ["After leaving NASA, Ride became a professor and started a company to help young people, especially girls, get excited about science."],
          "This sentence describes the company she started to inspire girls in science."),
    prose(f"{pid}-write", pid, "Written response",
          "Using the passage, explain how Sally Ride opened doors for other women and girls. Use at least two details and name the paragraph for each.",
          "research_simulation", True, 130, RUBRIC_INFO),
]))

# --- Quiz: Four Stars for Ann Dunwoody
pid = "g6-ann-dunwoody"
passages.append({
    "id": pid, "title": "Four Stars for Ann Dunwoody",
    "kind": "informational", "genre": "Biography",
    "grade": 6,
    "paragraphs": [
        "Ann Dunwoody came from a family that had worn the uniform for generations. Her father, her grandfather, and others before them had all served as soldiers. Growing up, she assumed she would do something else with her life, and she planned to teach physical education after college.",
        "In 1975 she joined the Army, expecting to stay only a couple of years. Instead she discovered that she loved leading people and solving hard problems. She decided to make the military her career, even though very few women held senior command at the time.",
        "Dunwoody became an expert in logistics, the difficult work of getting food, fuel, equipment, and supplies to the right place at the right time. Armies cannot fight or even move without logistics, so her skill made her valuable. Step by step she earned promotions that few women before her had reached.",
        "In November 2008 she made history when she became the first woman ever to earn the rank of four-star general in the armed forces. At the ceremony she said she was honored but added that she was sure she would not be the last. She wanted other women to see the rank as something they could reach too.",
        "As a four-star general she commanded a massive organization responsible for supplying soldiers all over the world. When she retired, leaders praised not only what she had achieved but the path she had opened. Ann Dunwoody had proved that the highest ranks were within reach for women who were ready to lead.",
    ],
})
g6_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Central idea",
       "What is the central idea of the passage?",
       [("A", "Ann Dunwoody had always planned to teach physical education after college"),
        ("B", "Ann Dunwoody became the first woman to earn four-star general rank"),
        ("C", "Logistics means moving food, fuel, and supplies to soldiers"),
        ("D", "Many members of Dunwoody's family served as soldiers too")],
       "B",
       "The passage centers on her historic rise to four-star general."),
    mc(f"{pid}-q2", pid, "Key detail",
       "What was Ann Dunwoody's area of expertise in the Army?",
       [("A", "Flying fast fighter jets in combat"),
        ("B", "Logistics, or supplying an army"),
        ("C", "Designing brand-new uniforms"),
        ("D", "Teaching physical education classes")],
       "B",
       "Paragraph 3 explains she became an expert in logistics."),
    mc(f"{pid}-q3", pid, "Vocabulary in context",
       "In paragraph 3, the word \"logistics\" most nearly means",
       [("A", "the work of moving supplies where they are needed"),
        ("B", "the special rank a soldier earns only after many years"),
        ("C", "a kind of weapon used by an army"),
        ("D", "a ceremony held to honor a general")],
       "A",
       "The passage defines logistics as getting supplies to the right place."),
    msel(f"{pid}-msel", pid, "Key details (multi-select)",
         "Select the TWO statements the passage supports about Ann Dunwoody.",
         [("A", "She came from a family with a long history of military service."),
          ("B", "She first planned to teach physical education after college."),
          ("C", "She refused every promotion she was ever offered."),
          ("D", "She invented a new kind of fighter jet for the Army."),
          ("E", "She left the Army after only two years of service.")],
         ["A", "B"],
         "Paragraphs 1 and 2 support the family history and the teaching plan."),
    short(f"{pid}-short", pid, "Cite textual evidence",
          "What did Dunwoody mean when she said she would not be the last? Use a detail from the passage and name the paragraph.",
          True, 2,
          "She wanted other women to see the four-star rank as something they too could reach (paragraph 4)."),
    prose(f"{pid}-write", pid, "Written response",
          "Using the passage, explain how Ann Dunwoody rose to become a four-star general. Use at least two details and name the paragraph for each.",
          "research_simulation", True, 130, RUBRIC_INFO),
]))

# ============================================================ FOX (G4)
# --- Quiz: How Cats Moved In
pid = "g4-how-cats-moved-in"
passages.append({
    "id": pid, "title": "How Cats Moved In",
    "kind": "informational", "genre": "Life science",
    "grade": 4,
    "paragraphs": [
        "House cats have not always lived with people. Long ago, all cats were wild. The story of how they came to nap on our couches began about ten thousand years ago, far away in the Middle East.",
        "Around that time, people stopped moving from place to place and started farming. They grew grain and stored it in big piles. The grain was a feast for mice, and soon the mice came in great numbers.",
        "Wild cats followed the mice. Where there were mice to hunt, the cats had plenty to eat. The people were happy too, because the cats protected the stored grain. Slowly, the cats and the people learned to live near each other.",
        "Over many years, the cats grew tamer and friendlier. People began to welcome them, feed them, and even keep them as pets. In ancient Egypt, cats were treated with great honor and care.",
        "Scientists say that in a way, cats chose to live with us. No one captured them or forced them to stay. They simply found that a life near people was a good life, and they have stayed by our side ever since.",
    ],
})
g4_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Central idea",
       "What is the passage mainly about?",
       [("A", "How wild cats slowly came to live with people"),
        ("B", "Why hungry mice like to eat the grain people store"),
        ("C", "How people in Egypt built their homes long ago"),
        ("D", "Why cats sleep on couches all day long")],
       "A",
       "The whole passage explains how cats came to live with people."),
    mc(f"{pid}-q2", pid, "Cause and effect",
       "Why did wild cats first come close to people?",
       [("A", "People called the cats inside"),
        ("B", "They were chasing the mice"),
        ("C", "They were cold in the winter"),
        ("D", "They wanted a soft couch")],
       "B",
       "Paragraph 3 says the cats followed the mice."),
    mc(f"{pid}-q3", pid, "Vocabulary in context",
       "In paragraph 4, the word \"tamer\" most nearly means",
       [("A", "more wild and afraid of people"),
        ("B", "less wild and friendlier"),
        ("C", "much faster at running"),
        ("D", "hungrier than ever before")],
       "B",
       "The next words say the cats grew friendlier, so tamer means less wild."),
    evsel(f"{pid}-evsel", pid, "Cite the evidence",
          "Click the sentence that tells why the people were glad to have the cats around.",
          3,
          ["The people were happy too, because the cats protected the stored grain."],
          "This sentence says the cats protected the grain, which made people glad."),
    short(f"{pid}-short", pid, "Cite the evidence",
          "Explain why the writer says cats chose to live with us. Use a detail and name the paragraph.",
          True, 2,
          "No one captured the cats or forced them to stay; they found that living near people was a good life (paragraph 5)."),
    prose(f"{pid}-write", pid, "Written response",
          "Using the passage, explain how wild cats became the pets we keep today. Use at least two details and name the paragraph for each.",
          "research_simulation", True, 110, RUBRIC_INFO),
]))

# --- Quiz: The Biggest and Smallest Cats
pid = "g4-big-and-small-cats"
passages.append({
    "id": pid, "title": "The Biggest and Smallest Cats",
    "kind": "informational", "genre": "Life science",
    "grade": 4,
    "paragraphs": [
        "Not all pet cats are the same size. Some are big enough to surprise you, and some stay tiny their whole lives. Two breeds show just how different cats can be: the Maine Coon and the Singapura.",
        "The Maine Coon is one of the largest pet cats in the world. A big one can stretch more than three feet long from nose to tail. With a thick, shaggy coat and a bushy tail, a Maine Coon can look almost like a small bobcat curled up on the bed.",
        "Even though they are large, Maine Coons are known for being gentle and playful. People sometimes call them the gentle giants of the cat world. They enjoy following their owners around the house like furry shadows.",
        "The Singapura is the opposite. It is one of the smallest pet cats, and a grown one may weigh only about five pounds. It has short fur, big ears, and large eyes that make it look like a kitten even when it is fully grown.",
        "Big or small, both cats make loving pets. The Maine Coon and the Singapura prove that a cat does not have to be a certain size to be a wonderful friend.",
    ],
})
g4_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Central idea",
       "What is the passage mostly about?",
       [("A", "Two cat breeds that are very different in size"),
        ("B", "How to brush a cat that has a thick, shaggy coat"),
        ("C", "Why cats like to follow people around a house"),
        ("D", "How a wild bobcat is different from a pet cat")],
       "A",
       "The passage compares the large Maine Coon and the small Singapura."),
    mc(f"{pid}-q2", pid, "Compare and contrast",
       "How is the Singapura different from the Maine Coon?",
       [("A", "It is one of the smallest pet cats"),
        ("B", "It has a long, bushy, shaggy tail"),
        ("C", "It can grow more than three feet long"),
        ("D", "It looks like a small wild bobcat")],
       "A",
       "Paragraph 4 says the Singapura is one of the smallest pet cats."),
    mc(f"{pid}-q3", pid, "Vocabulary in context",
       "Why are Maine Coons called \"gentle giants\"?",
       [("A", "They are large but kind and playful"),
        ("B", "They are small but very, very loud"),
        ("C", "They are wild and very hard to keep"),
        ("D", "They are quiet and like to hide away")],
       "A",
       "Paragraph 3 says they are large yet gentle and playful."),
    msel(f"{pid}-msel", pid, "Key details (multi-select)",
         "Select the TWO statements the passage supports about the Singapura.",
         [("A", "It is one of the smallest pet cats."),
          ("B", "It has big ears and large eyes."),
          ("C", "It can grow more than three feet long."),
          ("D", "It has a thick, shaggy coat."),
          ("E", "It looks like a small bobcat.")],
         ["A", "B"],
         "Paragraph 4 describes the small size, big ears, and large eyes."),
    short(f"{pid}-short", pid, "Cite the evidence",
          "Tell one way the Maine Coon and the Singapura are different. Use a detail and name the paragraph.",
          True, 2,
          "The Maine Coon can grow more than three feet long (paragraph 2), while the Singapura may weigh only about five pounds (paragraph 4)."),
    prose(f"{pid}-write", pid, "Written response",
          "Which cat would you rather have as a pet, the Maine Coon or the Singapura? Use at least two details from the passage to explain your choice and name the paragraph for each.",
          "research_simulation", True, 110, RUBRIC_INFO),
]))

# --- Quiz: The Diamond Cave (literary / Minecraft)
pid = "g4-the-diamond-cave"
passages.append({
    "id": pid, "title": "The Diamond Cave",
    "kind": "literary", "genre": "Adventure",
    "grade": 4,
    "paragraphs": [
        "Mateo and Jade had been digging for hours, and the sun in their game world was already sinking low. Their pickaxes chipped at the stone wall, clink, clink, clink, until suddenly Jade's pick broke through into empty space. Cool air drifted out of the dark opening.",
        "\"A cave,\" Jade whispered, holding up a torch. The light spilled across a huge cavern, and there, sparkling in the wall like blue stars, were diamonds. Mateo could hardly believe their luck.",
        "But caves were dangerous after dark. Just as they started to dig, a low hiss came from the shadows behind them. A green creeper was creeping closer, ready to explode and ruin everything they had found.",
        "Jade did not panic. \"Build a wall, quick!\" she said. The two friends slapped down blocks of cobblestone as fast as they could, sealing the creeper on the other side. They heard a muffled boom, but their diamonds were safe.",
        "By the time they carried their treasure home, the sun was rising again. Mateo grinned at Jade. They had not just found diamonds, he thought. They had learned that staying calm and working together was the real treasure.",
    ],
})
g4_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Plot",
       "What is the main problem in the story?",
       [("A", "Mateo and Jade cannot find any diamonds at all"),
        ("B", "A creeper threatens the diamonds they found"),
        ("C", "The two friends get lost on the way home"),
        ("D", "Jade's torch goes out in the dark cave")],
       "B",
       "The main problem is the creeper that could blow up their diamonds."),
    mc(f"{pid}-q2", pid, "Character",
       "What does Jade do that shows she stays calm?",
       [("A", "She runs out of the cave all by herself"),
        ("B", "She tells Mateo to build a wall fast"),
        ("C", "She drops her torch on the ground"),
        ("D", "She digs deeper into the dark cave")],
       "B",
       "Paragraph 4 says Jade did not panic and told Mateo to build a wall."),
    mc(f"{pid}-q3", pid, "Theme",
       "What lesson does Mateo learn by the end of the story?",
       [("A", "Diamonds are very easy to find in caves"),
        ("B", "It is always best to explore dark caves alone"),
        ("C", "Staying calm and working together matters"),
        ("D", "Creepers are not really dangerous at all")],
       "C",
       "The last paragraph says the real treasure was staying calm and working together."),
    ebsr(f"{pid}-ebsr", pid, "Cite the evidence (EBSR)",
         "Part A: How do the friends keep their diamonds safe?",
         [("A", "They run out of the dark cave"),
          ("B", "They wall off the creeper"),
          ("C", "They wait for sunrise"),
          ("D", "They put out the torch")],
         "B",
         "Part B: Which sentence best supports your answer to Part A?",
         [("A", "The two friends slapped down blocks of cobblestone as fast as they could, sealing the creeper on the other side."),
          ("B", "Cool air drifted out of the dark opening."),
          ("C", "Mateo could hardly believe their luck."),
          ("D", "By the time they carried their treasure home, the sun was rising again.")],
         "A",
         "They sealed the creeper behind cobblestone to protect the diamonds."),
    prose(f"{pid}-write", pid, "Written response",
          "Write about a time you stayed calm and solved a problem with a friend or with your family. What happened, and how did you feel afterward?",
          "narrative", False, 110, RUBRIC_NARR),
]))

# --- Quiz: The Firehouse Dog
pid = "g4-firehouse-dalmatian"
passages.append({
    "id": pid, "title": "The Firehouse Dog",
    "kind": "informational", "genre": "History",
    "grade": 4,
    "paragraphs": [
        "Have you ever seen a white dog covered in black spots riding on a fire truck? That dog is a Dalmatian, and it has been a friend to firefighters for a very long time. To understand why, we have to go back to the days before fire trucks had engines.",
        "Long ago, fire wagons were pulled by horses. When an alarm rang, the horses had to race through busy streets to reach the fire. The trouble was that horses are easily frightened by noise and crowds.",
        "This is where the Dalmatian helped. Dalmatians are calm around horses, and the two animals quickly became friends. A Dalmatian would run beside the horses, keeping them steady and helping clear a path through the crowd.",
        "The dogs were useful at the firehouse too. They guarded the wagon and the horses while the firefighters worked, and they kept the horses company between alarms. A good firehouse dog was a true member of the team.",
        "Today fire trucks have engines, so the horses are gone. But many fire stations still keep a Dalmatian, now as a mascot and a friend. The spotted dog reminds everyone of the brave horses and dogs that once raced to the rescue together.",
    ],
})
g4_sections.append((pid, [
    mc(f"{pid}-q1", pid, "Central idea",
       "What is the passage mainly about?",
       [("A", "Why fire stations keep Dalmatians"),
        ("B", "How horses learned to pull wagons"),
        ("C", "Where black-and-white dogs come from"),
        ("D", "How engines made fire trucks faster")],
       "A",
       "The passage explains why Dalmatians became firehouse dogs."),
    mc(f"{pid}-q2", pid, "Cause and effect",
       "Why was a Dalmatian helpful when wagons were pulled by horses?",
       [("A", "It could pull the wagon by itself"),
        ("B", "It kept the nervous horses calm"),
        ("C", "It put out the fire with water"),
        ("D", "It carried the firefighters' tools")],
       "B",
       "Paragraph 3 says Dalmatians are calm around horses and kept them steady."),
    mc(f"{pid}-q3", pid, "Vocabulary in context",
       "In paragraph 5, the word \"mascot\" most nearly means",
       [("A", "a tool that is used to fight fires"),
        ("B", "a friendly animal that brings team spirit"),
        ("C", "a kind of wagon that is pulled by horses"),
        ("D", "a loud alarm that rings at the fire station")],
       "B",
       "A mascot is a friendly animal kept by a team."),
    order(f"{pid}-order", pid, "Sequence",
          "Put the events from the passage in the order they happened.",
          [("s1", "An alarm rings at the firehouse."),
           ("s2", "The horses race through the busy streets."),
           ("s3", "A Dalmatian runs beside the horses to keep them calm."),
           ("s4", "The firefighters work while the dog guards the wagon.")],
          ["s1", "s2", "s3", "s4"],
          "This follows the order described across the passage."),
    short(f"{pid}-short", pid, "Cite the evidence",
          "Why do many fire stations still keep a Dalmatian today? Use a detail and name the paragraph.",
          True, 2,
          "The horses are gone, but stations keep a Dalmatian as a mascot and friend that reminds everyone of the brave horses and dogs (paragraph 5)."),
    prose(f"{pid}-write", pid, "Written response",
          "Using the passage, explain why Dalmatians became firehouse dogs. Use at least two details and name the paragraph for each.",
          "research_simulation", True, 110, RUBRIC_INFO),
]))

# ---------------------------------------------------------- wire into forms
data["passages"].extend(passages)
data["items"].extend(items)

for form in data["forms"]:
    if form["id"] == "g6-form-a":
        form["units"].append({
            "id": "g6-u3", "title": "Unit 3", "timeLimitMinutes": None,
            "sections": [{"passageIds": [pid_], "itemIds": iids} for pid_, iids in g6_sections],
        })
    elif form["id"] == "g4-form-a":
        form["units"].append({
            "id": "g4-u3", "title": "Unit 3", "timeLimitMinutes": None,
            "sections": [{"passageIds": [pid_], "itemIds": iids} for pid_, iids in g4_sections],
        })

with open(PATH, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")

print(f"Added {len(passages)} passages and {len(items)} items.")
print(f"Totals now: {len(data['passages'])} passages, {len(data['items'])} items.")
