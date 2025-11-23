import ollama

prompt = """
You are a question generator. [Based on the following content: Copyright is a legal concept, which gives the author or creator of a work legal control over the duplication and public performance of their work.[21] In many jurisdictions, this is limited by a time period after which the works then enter the public domain.[22] Copyright laws are a balance between the rights of creators of intellectual and artistic works and the rights of others to build upon those works.[21] During the time period of copyright the author's work may only be copied, modified, or publicly performed with the consent of the author, unless the use is a fair use.[23] Traditional copyright control limits the use of the work of the author to those who either pay royalties to the author for usage of the author's content or limit their use to fair use. Secondly, it limits the use of content whose author cannot be found.[24] Finally, it creates a perceived barrier between authors by limiting derivative works, such as mashups and collaborative content.[25] Although open content has been described as a counterbalance to copyright, open content licenses rely on a copyright holder's power to license their work, as copyleft which also utilizes copyright for such a purpose.], generate 10 multiple choice questions, each with four answer options and the correct answer identified.

Use the following format for each question:
Q: <question> | [A: <option1>, B: <option2>, C: <option3>, D: <option4> & Correct: <option_letter>]/

- All questions must be directly based on the provided content.
- Always include exactly four answer options (A, B, C, D).
- Only list the correct answer's option letter after 'Correct:'.

Generate clear, concise, and relevant questions and answer options from the source material.
"""

response = ollama.generate(model="gpt-oss:120b", prompt=prompt)

# Extract the generated text
generated_text = response['response']

# Split the response into individual questions
questions = generated_text.split('Q: ')[1:]  # Skip the first empty element

# Parse each question
parsed_questions = []

for question_text in questions:
    try:
        # Split question from answers
        if ' | [' in question_text:
            question_part, answers_part = question_text.split(' | [', 1)
        else:
            question_part, answers_part = question_text.split(' [', 1)
        
        # Clean up the question
        question = question_part.strip()
        
        # Split answers and correct answer
        if ' & Correct: ' in answers_part:
            answers_str, correct_part = answers_part.split(' & Correct: ', 1)
        else:
            answers_str, correct_part = answers_part.split(' Correct: ', 1)
        
        # Extract correct answer letter (remove any trailing characters)
        correct_letter = correct_part.split(']')[0].strip()
        
        # Parse individual answer options
        answers = {}
        answer_parts = answers_str.split(', ')
        
        for answer_part in answer_parts:
            if ': ' in answer_part:
                letter, answer_text = answer_part.split(': ', 1)
                answers[letter.strip()] = answer_text.strip()
        
        parsed_questions.append({
            'question': question,
            'answers': answers,
            'correct': correct_letter
        })
        
    except Exception as e:
        print(f"Error parsing question: {e}")
        print(f"Problematic text: {question_text[:100]}...")
        continue

# Print the parsed questions in a formatted way
for i, q in enumerate(parsed_questions, 1):
    print(f"\nQuestion {i}: {q['question']}")
    print("Options:")
    for letter, answer in q['answers'].items():
        print(f"  {letter}: {answer}")
    print(f"Correct Answer: {q['correct']}")

# Alternative: Print as lists for easier programmatic use
print("\n" + "="*50)
print("STRUCTURED DATA:")
print("="*50)

questions_list = [q['question'] for q in parsed_questions]
answers_list = [q['answers'] for q in parsed_questions]
correct_answers = [q['correct'] for q in parsed_questions]

print(f"\nQuestions list: {questions_list}")
print(f"\nAnswers list: {answers_list}")
print(f"\nCorrect answers: {correct_answers}")