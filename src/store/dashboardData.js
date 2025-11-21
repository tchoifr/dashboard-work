export const summaryCards = [
  { title: 'Total Balance', value: '24,500 USDC', change: '+12.5%', trend: 'up', icon: 'wallet' },
  { title: 'Active Projects', value: '8', change: '+2 new', trend: 'up', icon: 'briefcase' },
  { title: 'Total Clients', value: '24', change: '+4 this month', trend: 'up', icon: 'users' },
  { title: 'Monthly Revenue', value: '45,280 USDC', change: '+18.2%', trend: 'up', icon: 'chart' },
]

export const overviewData = {
  projects: [
    { name: 'DeFi Platform UI', client: 'CryptoVentures LLC', amount: '4,800 USDC', deadline: 'Dec 15', status: 'active' },
    { name: 'NFT Marketplace', client: 'Digital Arts Co', amount: '7,200 USDC', deadline: 'Dec 20', status: 'active' },
    { name: 'Smart Contract Audit', client: 'BlockChain Inc', amount: '82,000 USDC', deadline: 'Dec 18', status: 'pending' },
    { name: 'Web3 Integration', client: 'Tech Innovators', amount: '2,850 USDC', deadline: 'Nov 30', status: 'completed' },
  ],
  transactions: [
    { title: 'Payment from CryptoVentures', date: 'Dec 1, 2025', amount: '+4,800 USDC', status: 'completed', type: 'in' },
    { title: 'Milestone payment - NFT Project', date: 'Nov 28, 2025', amount: '+3,650 USDC', status: 'completed', type: 'in' },
    { title: 'Platform fees', date: 'Nov 27, 2025', amount: '-95 USDC', status: 'completed', type: 'out' },
    { title: 'Client deposit', date: 'Nov 25, 2025', amount: '+55,000 USDC', status: 'pending', type: 'in' },
  ],
}

export const contractData = [
  { name: 'DeFi Platform Development', client: 'CryptoVentures LLC', amount: '9,600 USDC', period: 'Dec 1 - Jan 31', status: 'active' },
  { name: 'Smart Contract Audit', client: 'BlockChain Inc', amount: '240,000 USDC', period: 'Dec 15 - Dec 30', status: 'signed' },
  { name: 'NFT Marketplace Contract', client: 'Digital Arts Co', amount: '8,000 USDC', period: 'Dec 10 - Feb 10', status: 'pending' },
  { name: 'Layer2 UI/UX Retainer', client: 'Layer2 Labs', amount: '12,000 USDC', period: 'Nov 1 - Dec 15', status: 'litige' },
]

export const jobData = [
  {
    id: 'job-1',
    title: 'Senior Web3 Developer',
    company: 'DeFi Protocol',
    location: 'Remote',
    posted: '2 days ago',
    tags: ['Solidity', 'React', 'Web3.js'],
    budget: '8,000-12,000 USDC/month',
    type: 'full-time',
    cta: 'Apply Now',
    status: 'En Attente',
    expected: 'Integration complete front + smart contracts pour dashboard DeFi, tests unitaires inclus.',
    delivered: 'Phase de cadrage terminee, POC front livre.',
  },
  {
    id: 'job-2',
    title: 'Smart Contract Auditor',
    company: 'Security Firm',
    location: 'USA/EU',
    posted: '1 week ago',
    tags: ['Solidity', 'Security', 'Hardhat'],
    budget: '15,000 USDC',
    type: 'contract',
    cta: 'Apply Now',
    status: 'En Cours',
    expected: 'Audit complet avec rapport, couverture de tests et recommandations de mitigation.',
    delivered: 'Revue partielle des contrats, rapport intermediaire fourni.',
  },
  {
    id: 'job-3',
    title: 'Blockchain Consultant',
    company: 'StartupDAO',
    location: 'Remote',
    posted: '3 days ago',
    tags: ['DeFi', 'Tokenomics', 'Strategy'],
    budget: '5,000 USDC/month',
    type: 'part-time',
    cta: 'Apply Now',
    status: 'Valide',
    expected: 'Roadmap tokenomics, strategie de gouvernance, ateliers produit.',
    delivered: 'Roadmap et livrables valides, ateliers completes.',
  },
  {
    id: 'job-4',
    title: 'UI/UX Web3 Designer',
    company: 'Layer2 Labs',
    location: 'Remote',
    posted: '1 day ago',
    tags: ['Figma', 'Design System', 'Web3'],
    budget: '3,500 USDC',
    type: 'contract',
    cta: 'Apply Now',
    status: 'Litige',
    expected: 'Maquettes completes du dashboard, handoff Figma + specs responsive.',
    delivered: 'Premieres maquettes livre, sections manquantes selon client.',
  },
]

export const daoDisputes = [
  {
    id: 'dispute-1',
    name: 'Layer2 UI/UX Retainer',
    client: 'Layer2 Labs',
    amount: '12,000 USDC',
    period: 'Nov 1 - Dec 15',
    expected: 'Maquettes completes desktop et mobile, handoff Figma + spec responsive.',
    delivered: 'Maquettes livre a 70%, handoff incomplet sur mobile.',
    status: 'Litige',
    votesFor: 62,
    totalVoters: 100,
  },
  {
    id: 'dispute-2',
    name: 'Smart Contract Audit',
    client: 'BlockChain Inc',
    amount: '240,000 USDC',
    period: 'Dec 15 - Dec 30',
    expected: 'Audit complet + rapport final + recommandations de mitigation.',
    delivered: 'Audit partiel, rapport intermediaire fourni.',
    status: 'Litige',
    votesFor: 48,
    totalVoters: 100,
  },
]

export const messagesData = {
  conversations: [
    { name: 'CryptoVentures LLC', lastMessage: 'Last message 2h ago' },
    { name: 'Digital Arts Co', lastMessage: 'Last message 2h ago' },
    { name: 'BlockChain Inc', lastMessage: 'Last message 2h ago' },
  ],
  thread: [
    { id: 1, from: 'client', author: 'CryptoVentures LLC', text: "Hi! How's the project going?", time: '10:30 AM' },
    { id: 2, from: 'me', author: 'You', text: "Great! I'm finishing the final touches on the UI.", time: '10:32 AM' },
    { id: 3, from: 'client', author: 'CryptoVentures LLC', text: 'Perfect! When can we expect delivery?', time: '10:33 AM' },
    { id: 4, from: 'me', author: 'You', text: 'Should be ready by Friday as planned.', time: '10:35 AM' },
  ],
}

export const profileData = {
  name: 'Jordan Doe',
  title: 'Senior Web3 Engineer',
  location: 'Remote - Worldwide',
  rate: '120 USDC/hr',
  availability: '10-15 hrs/week',
  bio: 'Building secure, performant Web3 products: DeFi, NFT, and smart contract platforms.',
  skills: ['Solidity', 'TypeScript', 'React', 'Next.js', 'Hardhat', 'Ethers.js', 'Rust (basic)'],
  highlights: [
    'Audited $250M TVL protocols (no criticals post-release)',
    'Shipped NFT marketplace reaching 150k users',
    'Deployed L2 payment rails reducing fees by 38%',
  ],
  portfolio: [
    { label: 'DeFi Dashboard', link: '#', tech: 'React, Ethers.js' },
    { label: 'NFT Marketplace', link: '#', tech: 'Next.js, Solidity' },
    { label: 'Audit Reports', link: '#', tech: 'Hardhat, Slither' },
  ],
}
