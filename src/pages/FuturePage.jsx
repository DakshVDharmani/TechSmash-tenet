import { mockMentors } from "../data/mockData";
import UserCard from "../components/UserCard";

const FuturePage = () => {
  return (
    <div className="min-h-screen p-8 md:p-12">
      <h1 className="font-mono text-3xl text-primary mb-8">
        FUTURE_CONNECTIONS
      </h1>
      <h2 className="font-mono text-lg text-secondary mb-6">
        // These are mentors ahead of you — individuals whose goals and
        alignment are further along. They can guide your progress.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockMentors.map((user, i) => (
          <UserCard key={user.id} user={user} index={i} />
        ))}
      </div>
    </div>
  );
};

export default FuturePage;
