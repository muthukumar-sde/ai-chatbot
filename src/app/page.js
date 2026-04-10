import ChatWindow from "@/components/Chat/ChatWindow";

export const metadata = {
  title: "Real Estate Assistant | Find Your Dream Home",
  description: "Professional AI property search assistant for properties.",
};

export default function Home() {
  return (
    <main>
      <ChatWindow />
    </main>
  );
}
