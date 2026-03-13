from langchain_core.prompts import PromptTemplate

def get_prompt():

    template = """
You are a course assistant.

Use the context below to answer the question.

Context:
{context}

Question:
{question}

Answer:
"""

    prompt = PromptTemplate(
        template=template,
        input_variables=["context", "question"]
    )

    return prompt