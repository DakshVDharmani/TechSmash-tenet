import { faker } from '@faker-js/faker';

// Mock Goals Data
export const mockGoals = [
  {
    id: 1,
    title: "PROJECT_CHRONOS_ANALYSIS",
    description: "Analyze temporal displacement data from Sector 7G.",
    category: "analysis",
    status: "Aligned",
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    tags: ["temporal", "data-analysis", "sector-7g"],
    allowedDomains: ["internal.nexora.dev", "data.archives.gov"],
    blockedDomains: ["news.ycombinator.com", "reddit.com"],
  },
  {
    id: 2,
    title: "OPERATION_NIGHTFALL_PREP",
    description: "Finalize logistics for upcoming temporal intervention.",
    category: "logistics",
    status: "Aligned",
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    tags: ["logistics", "intervention", "nightfall"],
    allowedDomains: ["maps.internal", "logistics.nexora.dev"],
    blockedDomains: ["amazon.com", "ebay.com"],
  },
  {
    id: 3,
    title: "SUBJECT_ZERO_MONITORING",
    description: "Maintain constant observation of Subject Zero's timeline.",
    category: "monitoring",
    status: "Deviated",
    lastUpdated: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    tags: ["surveillance", "subject-zero", "security"],
    allowedDomains: ["monitoring.nexora.dev"],
    blockedDomains: ["youtube.com", "twitch.tv"],
  }
];

// Mock Timeline Events
export const mockTimelineEvents = [
  { id: 1, timestamp: "09:00", domain: "internal.nexora.dev", title: "Data Analysis", classification: "aligned", duration: 45 },
  { id: 2, timestamp: "09:45", domain: "news.ycombinator.com", title: "External Feed Scan", classification: "distracted", duration: 15 },
  { id: 3, timestamp: "10:00", domain: "logistics.nexora.dev", title: "Logistics Review", classification: "aligned", duration: 60 },
  { id: 4, timestamp: "11:00", domain: "youtube.com", title: "Unauthorized Media", classification: "distracted", duration: 30 },
  { id: 5, timestamp: "11:30", domain: "monitoring.nexora.dev", title: "Subject Monitoring", classification: "aligned", duration: 90 },
];

// Mock Users for Social Matching
export const mockMentors = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName().toUpperCase(),
  goal: faker.lorem.words(3).toUpperCase(),
  alignmentScore: faker.number.int({ min: 85, max: 100 }),
  status: "mentor",
  bio: faker.lorem.sentence()
}));

export const mockPeers = Array.from({ length: 5 }, (_, i) => ({
  id: i + 6,
  name: faker.person.fullName().toUpperCase(),
  goal: faker.lorem.words(3).toUpperCase(),
  alignmentScore: faker.number.int({ min: 60, max: 85 }),
  status: "peer",
  bio: faker.lorem.sentence()
}));

export const mockMentees = Array.from({ length: 5 }, (_, i) => ({
  id: i + 11,
  name: faker.person.fullName().toUpperCase(),
  goal: faker.lorem.words(3).toUpperCase(),
  alignmentScore: faker.number.int({ min: 20, max: 60 }),
  status: "mentee",
  bio: faker.lorem.sentence()
}));

// Mock Messages
export const mockConversations = [
  { id: 1, user: mockMentors[0], lastMessage: "Your analysis of Sector 7G is promising.", timestamp: "2 min ago", unread: true },
  { id: 2, user: mockPeers[0], lastMessage: "Spotted a temporal anomaly at 14:32.", timestamp: "1 hour ago", unread: false }
];

export const mockMessages = [
  { id: 1, senderId: mockMentors[0].id, content: "Operator, your analysis of the Sector 7G displacement data is promising. Keep this channel secure.", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), isMe: false },
  { id: 2, senderId: "me", content: "Understood. Cross-referencing with the Chronos logs now. I've flagged three potential paradoxes.", timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), isMe: true },
  { id: 3, senderId: mockMentors[0].id, content: "Good. Proceed with caution. The integrity of the main timeline is paramount.", timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), isMe: false }
];

// Mock User Stats
export const mockUserStats = {
  realityScore: 78,
  alignedMinutes: 285,
  distractedMinutes: 45,
  deviationAlerts: 2,
};
