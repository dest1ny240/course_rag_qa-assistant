from langchain_openai import ChatOpenAI

def get_llm():

    llm = ChatOpenAI(
        base_url="http://127.0.0.1:1233/v1",
        api_key="lm-studio",
        model="qwen/qwen3-4b-2507",
        temperature=0
    )

    return llm