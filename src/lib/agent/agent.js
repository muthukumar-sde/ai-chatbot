import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { searchProperties, queryKnowledgeBase } from "./tools.js";
import { systemPrompt } from "./config.js";

const tools = [searchProperties, queryKnowledgeBase];
const toolNode = new ToolNode(tools);

const model = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0.5,
});

const modelWithTools = model.bindTools(tools);

// Define the function that calls the model
async function callModel(state) {
  const { messages } = state;

  const response = await modelWithTools.invoke([
    { role: "system", content: systemPrompt },
    ...messages,
  ]);

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
