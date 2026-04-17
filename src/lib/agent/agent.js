import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { searchProperties, queryKnowledgeBase, searchNearbyAmenities } from "./tools.js";
import { buildChatPrompt } from "./prompts.js";

const tools = [searchProperties, queryKnowledgeBase, searchNearbyAmenities];
const toolNode = new ToolNode(tools);

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.5,
});

const modelWithTools = model.bindTools(tools);

// Build the prompt once at startup (full prompt by default)
const chatPrompt = buildChatPrompt();

// Define the function that calls the model
async function callModel(state) {
  const { messages } = state;

  // Pipe the prompt template into the model
  const chain = chatPrompt.pipe(modelWithTools);
  const response = await chain.invoke({ messages });

  return { messages: [response] };
}

// Define the graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (state) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    return "__end__";
  })
  .addEdge("tools", "agent");

// Checkpointer persists conversation history per thread_id
const checkpointer = new MemorySaver();
export const app = workflow.compile({ checkpointer });