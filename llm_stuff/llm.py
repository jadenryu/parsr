from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
import logfire
from pydantic import BaseModel
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

class OutputSchema(BaseModel):
    data: str

logfire.configure(
    token='pylf_v1_us_1WdVDM4q23QSyvwQ7yr9q6yvGtqrDZnkHK0Zy7Q6PBSf',
    console=False
)

# Define a model that uses OpenRouter
api_key = os.getenv("GEMINI_API_KEY")
model = OpenAIModel(
    'gpt-4o-mini',
    base_url='https://openrouter.ai/api/v1',
    api_key=api_key)

# Define a very simple agent
agent = Agent(model=model, result_type=OutputSchema)

# Run the agent asynchronously, conducting a conversation with the LLM.

async def main():
    while True:
        user_input = input("Enter your question")
        result = agent.run(user_input)
        print(result.data)
        print("--------------------------------")
        if user_input.strip().lower() in ["stop", "exit"]:
            break
        message_history = result.new_messages()
if __name__ == "__main__":
    main()


