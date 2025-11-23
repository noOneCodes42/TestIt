import ollama

prompt = """
You are a question generator. Based on the following content:

Free content, libre content, libre information, or free information is any kind of creative work,[1] such as a work of art, a book,[2] a software program,[3][4] or any other creative content for which there are very minimal copyright and other legal limitations on usage, modification and distribution. These are works or expressions which can be freely studied, applied, copied and modified by anyone for any purpose[5][6] including, in some cases, commercial purposes. Free content encompasses all works in the public domain and also those copyrighted works whose licenses honor and uphold the definition of free cultural work.[7]

Generate exactly 10 multiple-choice questions.
Each question must have exactly 4 options (A, B, C, D) and one correct answer.

Format (one question per block, no numbering):
Q: <question text>
A: <option A>
B: <option B>
C: <option C>
D: <option D>
Correct: <letter>   <-- only A, B, C, or D
"""

ollama_response = ollama.generate(model="gpt-oss:120b", prompt=prompt)
raw_text = ollama_response["response"]

questions = []
for block in raw_text.strip().split("Q:")[1:]:
    lines = [line.strip() for line in block.strip().split("\n") if line.strip()]
    if len(lines) < 6:
        continue

    question_text = lines[0]
    options = [
        lines[1].replace("A:", "").strip(),
        lines[2].replace("B:", "").strip(),
        lines[3].replace("C:", "").strip(),
        lines[4].replace("D:", "").strip()
    ]
    correct_letter = lines[5].replace("Correct:", "").strip().upper()
    
    if correct_letter not in {"A", "B", "C", "D"}:
        continue

    correct_answer = [options[ord(correct_letter) - 65]]

    questions.append({
        "question_text": question_text,
        "options": options,
        "correct_answer": correct_answer
    })

# PRINT ONLY WHAT YOU NEED — EXACTLY LIKE THIS
for q in questions:
    print(q["question_text"])
    print(q["options"])
    print(q["correct_answer"])
    print()  # empty line between questions