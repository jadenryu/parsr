from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
import logfire
logfire.configure(
    token='pylf_v1_us_1WdVDM4q23QSyvwQ7yr9q6yvGtqrDZnkHK0Zy7Q6PBSf',
    console=False
)
# Define a model that uses OpenRouter with your API key
model = OpenAIModel(
    'gpt-5-mini',
    base_url='https://openrouter.ai/api/v1',
    api_key='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'
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

