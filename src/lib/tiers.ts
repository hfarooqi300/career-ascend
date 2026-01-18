export const TIERS = {
  text_review: {
    id: "text_review",
    name: "Signal Text Review",
    price: 99,
    priceId: "price_1SqDiqPeJlf5mYezKmay87vL",
    description: "Get expert feedback on your resume and LinkedIn profile",
    features: [
      "Comprehensive resume review",
      "LinkedIn profile optimization",
      "Written feedback within 48 hours",
      "Actionable improvement suggestions",
    ],
    includesBooking: false,
  },
  coaching: {
    id: "coaching",
    name: "Signal Coaching Session",
    price: 299,
    priceId: "price_1SqDj2PeJlf5mYez4G7CMDKL",
    description: "Live 1-to-1 coaching session for resume, LinkedIn, and positioning",
    features: [
      "Everything in Text Review",
      "60-minute live coaching session",
      "Personalized career strategy",
      "Interview preparation tips",
      "Follow-up action plan",
    ],
    includesBooking: true,
  },
} as const;

export type TierType = keyof typeof TIERS;
