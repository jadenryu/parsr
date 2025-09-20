from pydantic_ai import Agent
from pydantic import BaseModel, Field
from pydantic_ai.models.openai import OpenAIModel
import logfire
import os
from dotenv import load_dotenv

load_dotenv()
logfire.configure(
    token=os.getenv("LOGFIRE_TOKEN"),
    console=False
)

class OutputModel(BaseModel):
    result: str
    confidence: float = Field(..., ge=0, le=1)

api_key = os.getenv("OPENAI_API_KEY")
# Define a model that uses OpenRouter with your API key
model = OpenAIModel(
    'gpt-5-mini',
    base_url='https://openrouter.ai/api/v1',
    api_key=api_key
)

# Define a very simple agent
agent = Agent(model=model)

# Run the agent synchronously, conducting a conversation with the LLM.
def main():
    while True:
        user_input = input("You: ")
        if user_input.lower() in ['exit', 'quit']:
            break
        response = agent.run_sync(user_input)
        message_history = response.new_messages()
        print(f"Agent: {response.data}")
if __name__ == "__main__":
    main()

