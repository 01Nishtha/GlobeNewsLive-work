import { NextResponse } from 'next/server';

// Simulated news feed - in production this would fetch from RSS/APIs
const NEWS_ITEMS = [
  { id: '1', title: 'Iran war latest: Trump issues new threat, IRGC attacks ship in Hormuz', source: 'Reuters', category: 'conflict', urgency: 'breaking' as const },
  { id: '2', title: 'Israel and Lebanon conclude direct talks as strikes continue', source: 'Al Jazeera', category: 'conflict', urgency: 'breaking' as const },
  { id: '3', title: 'Pentagon removes top Navy official amid military shake-up', source: 'CNN', category: 'defense', urgency: 'urgent' as const },
  { id: '4', title: 'Fuel price hikes disrupt flights across Middle East', source: 'BBC', category: 'economy', urgency: 'normal' as const },
  { id: '5', title: 'Death sentences soar in DR Congo after moratorium lifted', source: 'France 24', category: 'human-rights', urgency: 'normal' as const },
  { id: '6', title: 'Russian Oil Revenues Nearly Doubled in March', source: 'NYT', category: 'energy', urgency: 'normal' as const },
  { id: '7', title: 'IMF drops Eurozone growth forecast to 1.1% amid Iran war', source: 'Euronews', category: 'economy', urgency: 'urgent' as const },
  { id: '8', title: 'Italy suspends defense pact with Israel', source: 'Reuters', category: 'diplomacy', urgency: 'urgent' as const },
  { id: '9', title: 'New Rules Hinder Foreign Firms From Moving Supply Chains From China', source: 'NYT', category: 'trade', urgency: 'normal' as const },
  { id: '10', title: 'Thousands gather in Poland for annual March of the Living', source: 'Euronews', category: 'world', urgency: 'normal' as const },
  { id: '11', title: 'Risk of sarcophagus collapse over Chornobyl Unit 4 after drone strike', source: 'Greenpeace', category: 'nuclear', urgency: 'urgent' as const },
  { id: '12', title: 'Carney vows focus on affordability after winning Canada election', source: 'Al Jazeera', category: 'politics', urgency: 'normal' as const },
  { id: '13', title: 'Drones, Iran war escalating horror as Sudan war enters fourth year', source: 'Al Jazeera', category: 'conflict', urgency: 'breaking' as const },
  { id: '14', title: 'Qantas hikes fares, cuts domestic services as fuel uncertainty bites', source: 'SBS', category: 'aviation', urgency: 'normal' as const },
  { id: '15', title: 'UN chief says talks on Iran war likely to restart', source: 'Al Jazeera', category: 'diplomacy', urgency: 'normal' as const },
];

export async function GET() {
  return NextResponse.json({
    items: NEWS_ITEMS,
    timestamp: Date.now(),
    total: NEWS_ITEMS.length,
  });
}
