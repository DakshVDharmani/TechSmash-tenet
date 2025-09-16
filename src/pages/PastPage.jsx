import { mockMentees } from "../data/mockData";
import UserCard from "../components/UserCard";

const PastPage = () => {
  return (
    <div className="min-h-screen p-8 md:p-12">
      <h1 className="font-mono text-3xl text-primary mb-8">
        PAST_CONNECTIONS
      </h1>
      <h2 className="font-mono text-lg text-secondary mb-6">
        // These are mentees behind you — people starting on goals you’ve
        already advanced in. Guide them with your experience.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockMentees.map((user, i) => (
          <UserCard key={user.id} user={user} index={i} />
        ))}
      </div>
    </div>
  );
};

export default PastPage;
