export const summaryCards = [
  {
    title: 'Total Balance',
    value: '12.5 ETH',
    change: '+12.5%',
    trend: 'up',
    icon: 'wallet',
  },
  {
    title: 'Active Projects',
    value: '8',
    change: '+2 new',
    trend: 'up',
    icon: 'briefcase',
  },
  {
    title: 'Total Clients',
    value: '24',
    change: '+4 this month',
    trend: 'up',
    icon: 'users',
  },
  {
    title: 'Monthly Revenue',
    value: '$45,280',
    change: '+18.2%',
    trend: 'up',
    icon: 'chart',
  },
]

export const overviewData = {
  projects: [
    {
      name: 'DeFi Platform UI',
      client: 'CryptoVentures LLC',
      amount: '2.5 ETH',
      deadline: 'Dec 15',
      status: 'active',
    },
    {
      name: 'NFT Marketplace',
      client: 'Digital Arts Co',
      amount: '3.8 ETH',
      deadline: 'Dec 20',
      status: 'active',
    },
    {
      name: 'Smart Contract Audit',
      client: 'BlockChain Inc',
      amount: '1.2 BTC',
      deadline: 'Dec 18',
      status: 'pending',
    },
    {
      name: 'Web3 Integration',
      client: 'Tech Innovators',
      amount: '1.5 ETH',
      deadline: 'Nov 30',
      status: 'completed',
    },
  ],
  transactions: [
    {
      title: 'Payment from CryptoVentures',
      date: 'Dec 1, 2025',
      amount: '+2.5 ETH',
      status: 'completed',
      type: 'in',
    },
    {
      title: 'Milestone payment - NFT Project',
      date: 'Nov 28, 2025',
      amount: '+1.9 ETH',
      status: 'completed',
      type: 'in',
    },
    {
      title: 'Platform fees',
      date: 'Nov 27, 2025',
      amount: '-0.05 ETH',
      status: 'completed',
      type: 'out',
    },
    {
      title: 'Client deposit',
      date: 'Nov 25, 2025',
      amount: '+0.8 BTC',
      status: 'pending',
      type: 'in',
    },
  ],
}

export const contractData = [
  {
    name: 'DeFi Platform Development',
    client: 'CryptoVentures LLC',
    amount: '5.0 ETH',
    period: 'Dec 1 - Jan 31',
    status: 'active',
  },
  {
    name: 'Smart Contract Audit',
    client: 'BlockChain Inc',
    amount: '3.5 BTC',
    period: 'Dec 15 - Dec 30',
    status: 'signed',
  },
  {
    name: 'NFT Marketplace Contract',
    client: 'Digital Arts Co',
    amount: '4.2 ETH',
    period: 'Dec 10 - Feb 10',
    status: 'pending',
  },
]

export const jobData = [
  {
    title: 'Senior Web3 Developer',
    company: 'DeFi Protocol',
    location: 'Remote',
    posted: '2 days ago',
    tags: ['Solidity', 'React', 'Web3.js'],
    budget: '8-12 ETH/month',
    type: 'full-time',
    cta: 'Apply Now',
  },
  {
    title: 'Smart Contract Auditor',
    company: 'Security Firm',
    location: 'USA/EU',
    posted: '1 week ago',
    tags: ['Solidity', 'Security', 'Hardhat'],
    budget: '15 ETH',
    type: 'contract',
    cta: 'Apply Now',
  },
  {
    title: 'Blockchain Consultant',
    company: 'StartupDAO',
    location: 'Remote',
    posted: '3 days ago',
    tags: ['DeFi', 'Tokenomics', 'Strategy'],
    budget: '5 ETH/month',
    type: 'part-time',
    cta: 'Apply Now',
  },
]

export const messagesData = {
  conversations: [
    { name: 'CryptoVentures LLC', lastMessage: 'Last message 2h ago' },
    { name: 'Digital Arts Co', lastMessage: 'Last message 2h ago' },
    { name: 'BlockChain Inc', lastMessage: 'Last message 2h ago' },
  ],
  thread: [
    {
      id: 1,
      from: 'client',
      author: 'CryptoVentures LLC',
      text: "Hi! How's the project going?",
      time: '10:30 AM',
    },
    {
      id: 2,
      from: 'me',
      author: 'You',
      text: "Great! I'm finishing the final touches on the UI.",
      time: '10:32 AM',
    },
    {
      id: 3,
      from: 'client',
      author: 'CryptoVentures LLC',
      text: 'Perfect! When can we expect delivery?',
      time: '10:33 AM',
    },
    {
      id: 4,
      from: 'me',
      author: 'You',
      text: 'Should be ready by Friday as planned.',
      time: '10:35 AM',
    },
  ],
}

export const profileData = {
  name: 'Jordan Doe',
  title: 'Senior Web3 Engineer',
  location: 'Remote • Worldwide',
  rate: '120 USD/hr',
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
