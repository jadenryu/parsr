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
while True:
    user_input = input("You: ")
    if user_input.lower() in ['exit', 'quit']:
        break
    response = agent.run_sync(user_input)
    message_history = response.new_messages()
    print(f"Agent: {response.data}")
