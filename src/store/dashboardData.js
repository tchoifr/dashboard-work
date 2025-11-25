const ACTIVE_USER_ID = 2
const NOW = new Date('2025-12-05T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

const users = [
  {
    id: 1,
    walletAddress: '0xA1B2C3CLIENT',
    username: 'CryptoVentures LLC',
    avatarUrl: '/avatars/cryptoventures.png',
    title: 'Product Owner',
    bio: 'Crypto payments company building full-stack DeFi dashboard.',
    location: 'Berlin, DE',
    availability: 'N/A',
    rateHourlyUsd: null,
    about: 'Client building CeDeFi platform with escrow milestone flows.',
    foot: 'client',
    skills: ['Product', 'Ops', 'Growth'],
    highlights: ['Raised $25M Series A', 'Onboarded 40k wallets'],
    portfolio: [],
    createdAt: '2023-09-12T10:12:00Z',
    lastLoginAt: '2025-12-05T08:45:00Z',
  },
  {
    id: 2,
    walletAddress: '0xFREELANCE42',
    username: 'Jordan Doe',
    avatarUrl: '/avatars/jordan.png',
    title: 'Senior Web3 Engineer',
    bio: 'Building secure, performant Web3 products: DeFi, NFT, and smart contract platforms.',
    location: 'Remote - Worldwide',
    availability: '10-15 hrs/week',
    rateHourlyUsd: 120,
    about: 'Freelance engineer shipping dashboards, audits and governance tooling.',
    foot: 'freelancer',
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
    createdAt: '2022-02-12T07:12:00Z',
    lastLoginAt: '2025-12-05T09:00:00Z',
  },
  {
    id: 3,
    walletAddress: '0xALEX001',
    username: 'Alex Martin',
    avatarUrl: '/avatars/alex.png',
    title: 'Fullstack Web3 Engineer',
    bio: 'Built L2 bridges and dashboards for onchain payments.',
    location: 'Lisbon, PT',
    availability: '20 hrs/week',
    rateHourlyUsd: 110,
    about: 'Focus on delivery of front + contracts, tests included.',
    foot: 'talent',
    skills: ['Solidity', 'TypeScript', 'Ethers.js'],
    highlights: ['Deployed rollup dashboard', 'Led cross-chain bridge MVP'],
    portfolio: [
      { label: 'Bridge L2', link: '#', tech: 'Next.js, Solidity' },
      { label: 'Treasury UI', link: '#', tech: 'React, Wagmi' },
    ],
    createdAt: '2021-05-01T09:00:00Z',
    lastLoginAt: '2025-12-03T15:00:00Z',
  },
  {
    id: 4,
    walletAddress: '0xCLARA001',
    username: 'Clara Duval',
    avatarUrl: '/avatars/clara.png',
    title: 'Frontend + Web3',
    bio: 'Shipped responsive DeFi dashboards.',
    location: 'Paris, FR',
    availability: '25 hrs/week',
    rateHourlyUsd: 95,
    about: 'UI + integration stack lead.',
    foot: 'talent',
    skills: ['React', 'Next.js', 'Web3.js'],
    highlights: ['Led responsive revamp for staking product'],
    portfolio: [{ label: 'NFT Launchpad', link: '#', tech: 'React, Wagmi' }],
    createdAt: '2021-11-11T10:00:00Z',
    lastLoginAt: '2025-12-02T14:00:00Z',
  },
  {
    id: 5,
    walletAddress: '0xSAMIR001',
    username: 'Samir Patel',
    avatarUrl: '/avatars/samir.png',
    title: 'Smart Contract Dev',
    bio: 'Security + gas optimization.',
    location: 'Dubai, UAE',
    availability: '15 hrs/week',
    rateHourlyUsd: 120,
    about: 'Solidity engineer focused on audits and delivery.',
    foot: 'talent',
    skills: ['Solidity', 'Hardhat', 'Ethers.js'],
    highlights: ['Optimized AMM core saving 18% gas'],
    portfolio: [{ label: 'AMM Contracts', link: '#', tech: 'Solidity, Hardhat' }],
    createdAt: '2020-04-10T11:00:00Z',
    lastLoginAt: '2025-12-04T09:00:00Z',
  },
  {
    id: 6,
    walletAddress: '0xLINA001',
    username: 'Lina Ortega',
    avatarUrl: '/avatars/lina.png',
    title: 'Product Engineer',
    bio: 'UI + product delivery.',
    location: 'Madrid, ES',
    availability: '18 hrs/week',
    rateHourlyUsd: 105,
    about: 'Can take product scope + UI handoff.',
    foot: 'talent',
    skills: ['TypeScript', 'UI/UX', 'Web3'],
    highlights: ['Scoped DAO tooling for 3 treasuries'],
    portfolio: [],
    createdAt: '2021-06-20T08:00:00Z',
    lastLoginAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 7,
    walletAddress: '0xMINA001',
    username: 'Mina Chen',
    avatarUrl: '/avatars/mina.png',
    title: 'Smart Contract Auditor',
    bio: 'Audits of DeFi protocols and bridges.',
    location: 'Remote - EU/US friendly',
    availability: '10-15 hrs/week',
    rateHourlyUsd: 150,
    about: 'Deliver detailed reports with mitigations.',
    foot: 'talent',
    skills: ['Hardhat', 'Slither', 'Foundry', 'Echidna', 'Manual review'],
    highlights: [
      'Audited $250M TVL protocols (no criticals post-release)',
      'Coverage with fuzz + invariants',
      'Reports focused on mitigation',
    ],
    portfolio: [
      { label: 'Bridge Audit', link: '#', tech: 'Hardhat, Slither' },
      { label: 'AMM Audit', link: '#', tech: 'Foundry, Echidna' },
      { label: 'DAO Treasury', link: '#', tech: 'Manual review, zk-SNARK flows' },
    ],
    createdAt: '2019-01-01T00:00:00Z',
    lastLoginAt: '2025-12-04T07:00:00Z',
  },
  {
    id: 8,
    walletAddress: '0xLEO001',
    username: 'Leo Martins',
    avatarUrl: '/avatars/leo.png',
    title: 'Solidity Auditor',
    bio: 'Manual reviews of DeFi primitives.',
    location: 'Sao Paulo, BR',
    availability: '10 hrs/week',
    rateHourlyUsd: 140,
    about: 'Reports concise, focus on logical bugs.',
    foot: 'talent',
    skills: ['Foundry', 'Echidna', 'MythX'],
    highlights: ['Led review of options protocol'],
    portfolio: [],
    createdAt: '2022-08-12T00:00:00Z',
    lastLoginAt: '2025-12-02T12:00:00Z',
  },
  {
    id: 9,
    walletAddress: '0xPRIYA001',
    username: 'Priya Singh',
    avatarUrl: '/avatars/priya.png',
    title: 'Security Researcher',
    bio: 'Audits AMM/bridge, mitigation planning.',
    location: 'Toronto, CA',
    availability: '12 hrs/week',
    rateHourlyUsd: 160,
    about: 'Focus on manual threat modeling.',
    foot: 'talent',
    skills: ['Slither', 'Manual tests', 'Threat modeling'],
    highlights: ['Detection of oracle exploits pre-launch'],
    portfolio: [],
    createdAt: '2020-02-15T00:00:00Z',
    lastLoginAt: '2025-12-03T16:00:00Z',
  },
  {
    id: 10,
    walletAddress: '0xJONAS001',
    username: 'Jonas Weber',
    avatarUrl: '/avatars/jonas.png',
    title: 'Smart Contract Security',
    bio: 'Experience on options/derivatives protocols.',
    location: 'Zurich, CH',
    availability: '10 hrs/week',
    rateHourlyUsd: 145,
    about: 'Formal verification and manual review.',
    foot: 'talent',
    skills: ['Foundry', 'Formal verification', 'Manual review'],
    highlights: ['Verified perps AMM invariants'],
    portfolio: [],
    createdAt: '2020-09-30T00:00:00Z',
    lastLoginAt: '2025-12-01T12:00:00Z',
  },
  {
    id: 11,
    walletAddress: '0xSARA001',
    username: 'Sara Lopez',
    avatarUrl: '/avatars/sara.png',
    title: 'DeFi Strategist',
    bio: 'Piloted DAO launches and workshops.',
    location: 'Buenos Aires, AR',
    availability: '8 hrs/week',
    rateHourlyUsd: 100,
    about: 'Roadmaps and governance strategy.',
    foot: 'talent',
    skills: ['Tokenomics', 'Governance', 'Workshops'],
    highlights: ['Launched 2 DAOs to mainnet'],
    portfolio: [],
    createdAt: '2018-06-06T00:00:00Z',
    lastLoginAt: '2025-12-03T18:00:00Z',
  },
  {
    id: 12,
    walletAddress: '0xNOAH001',
    username: 'Noah Kim',
    avatarUrl: '/avatars/noah.png',
    title: 'Product Designer',
    bio: 'Ships data-heavy dashboards.',
    location: 'Seoul, KR',
    availability: '15 hrs/week',
    rateHourlyUsd: 85,
    about: 'Owns design system + delivery.',
    foot: 'talent',
    skills: ['Figma', 'Design System', 'Prototype'],
    highlights: ['Maintains DAO design kit'],
    portfolio: [],
    createdAt: '2022-03-01T00:00:00Z',
    lastLoginAt: '2025-12-04T08:00:00Z',
  },
  {
    id: 13,
    walletAddress: '0xEMMA001',
    username: 'Emma Clark',
    avatarUrl: '/avatars/emma.png',
    title: 'UX/UI Designer',
    bio: 'Focus on KYC/onboarding flows.',
    location: 'London, UK',
    availability: '18 hrs/week',
    rateHourlyUsd: 90,
    about: 'Motion + onboarding for crypto apps.',
    foot: 'talent',
    skills: ['UX research', 'Motion', 'Web3 onboarding'],
    highlights: ['Reduced signup drop-off by 40%'],
    portfolio: [],
    createdAt: '2020-12-01T00:00:00Z',
    lastLoginAt: '2025-12-02T11:00:00Z',
  },
  {
    id: 14,
    walletAddress: '0xSECURITYFIRM',
    username: 'Security Firm',
    avatarUrl: '/avatars/security-firm.png',
    title: 'Audit boutique',
    bio: 'Looking for auditors to review DeFi stack.',
    location: 'USA / EU',
    availability: 'Full-time client',
    rateHourlyUsd: null,
    about: 'Security retainer for DeFi clients.',
    foot: 'client',
    skills: ['Security', 'Audits'],
    highlights: ['Protected $1B TVL'],
    portfolio: [],
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2025-12-04T17:00:00Z',
  },
  {
    id: 15,
    walletAddress: '0xSTARTUPDAO',
    username: 'StartupDAO',
    avatarUrl: '/avatars/startupdao.png',
    title: 'Early DAO',
    bio: 'Tokenomics + governance partner needed.',
    location: 'Remote',
    availability: 'DAO client',
    rateHourlyUsd: null,
    about: 'Preparing treasury launch.',
    foot: 'client',
    skills: ['DAO', 'Governance'],
    highlights: ['900 community members'],
    portfolio: [],
    createdAt: '2024-04-01T00:00:00Z',
    lastLoginAt: '2025-12-03T10:00:00Z',
  },
  {
    id: 16,
    walletAddress: '0xLAYER2LABS',
    username: 'Layer2 Labs',
    avatarUrl: '/avatars/layer2labs.png',
    title: 'Layer2 product studio',
    bio: 'Needs UI/UX handoff for milestone release.',
    location: 'Remote',
    availability: 'Client',
    rateHourlyUsd: null,
    about: 'Shipping L2 UX for payments.',
    foot: 'client',
    skills: ['Product', 'UX'],
    highlights: ['Governance for 5 DAOs'],
    portfolio: [],
    createdAt: '2023-06-15T00:00:00Z',
    lastLoginAt: '2025-12-04T07:30:00Z',
  },
  {
    id: 17,
    walletAddress: '0xDIGITALARTS',
    username: 'Digital Arts Co',
    avatarUrl: '/avatars/digitalarts.png',
    title: 'NFT Marketplace',
    bio: 'Scaling creators onboarding.',
    location: 'New York, US',
    availability: 'Client',
    rateHourlyUsd: null,
    about: 'Drops and auctions.',
    foot: 'client',
    skills: ['Design', 'NFT'],
    highlights: ['150k creators'],
    portfolio: [],
    createdAt: '2021-10-01T00:00:00Z',
    lastLoginAt: '2025-12-05T07:00:00Z',
  },
  {
    id: 18,
    walletAddress: '0xBLOCKCHAININC',
    username: 'BlockChain Inc',
    avatarUrl: '/avatars/blockchaininc.png',
    title: 'Enterprise Blockchain',
    bio: 'Scaling audits for institutional launch.',
    location: 'San Francisco, US',
    availability: 'Client',
    rateHourlyUsd: null,
    about: 'Smart contract security engagement.',
    foot: 'client',
    skills: ['Enterprise'],
    highlights: ['Serving Fortune 50'],
    portfolio: [],
    createdAt: '2020-02-02T00:00:00Z',
    lastLoginAt: '2025-12-05T06:30:00Z',
  },
  {
    id: 19,
    walletAddress: '0xTECHINNOV',
    username: 'Tech Innovators',
    avatarUrl: '/avatars/techinnovators.png',
    title: 'Innovation Lab',
    bio: 'Web3 integration for enterprise clients.',
    location: 'London, UK',
    availability: 'Client',
    rateHourlyUsd: null,
    about: 'Fintech and automotive partnerships.',
    foot: 'client',
    skills: ['Consulting'],
    highlights: ['10+ integrations'],
    portfolio: [],
    createdAt: '2019-08-18T00:00:00Z',
    lastLoginAt: '2025-12-01T08:20:00Z',
  },
  {
    id: 20,
    walletAddress: '0xDEFIPROTOCOL',
    username: 'DeFi Protocol',
    avatarUrl: '/avatars/defiprotocol.png',
    title: 'L2 DeFi platform',
    bio: 'Needs full dashboard integration.',
    location: 'Remote',
    availability: 'Client',
    rateHourlyUsd: null,
    about: 'Building L2 rails for retail investors.',
    foot: 'client',
    skills: ['DeFi'],
    highlights: ['TVL $80M'],
    portfolio: [],
    createdAt: '2023-03-10T00:00:00Z',
    lastLoginAt: '2025-12-04T13:00:00Z',
  },
]

const projects = [
  {
    id: 'project-1',
    title: 'DeFi Platform UI',
    companyName: 'CryptoVentures LLC',
    amountUsd: 4800,
    status: 'active',
    deadline: '2025-12-15',
    createdAt: '2025-09-01',
    clientId: 1,
    freelancerId: 2,
  },
  {
    id: 'project-2',
    title: 'NFT Marketplace',
    companyName: 'Digital Arts Co',
    amountUsd: 7200,
    status: 'active',
    deadline: '2025-12-20',
    createdAt: '2025-09-12',
    clientId: 17,
    freelancerId: 2,
  },
  {
    id: 'project-3',
    title: 'Smart Contract Audit',
    companyName: 'BlockChain Inc',
    amountUsd: 82000,
    status: 'pending',
    deadline: '2025-12-18',
    createdAt: '2025-10-01',
    clientId: 18,
    freelancerId: 2,
  },
  {
    id: 'project-4',
    title: 'Web3 Integration',
    companyName: 'Tech Innovators',
    amountUsd: 2850,
    status: 'completed',
    deadline: '2025-11-30',
    createdAt: '2025-07-15',
    clientId: 19,
    freelancerId: 2,
  },
]

const jobs = [
  {
    id: 'job-1',
    title: 'Senior Web3 Developer',
    companyName: 'DeFi Protocol',
    location: 'Remote',
    postedAt: '2025-12-03T08:00:00Z',
    jobType: 'full-time',
    budgetMinUsd: 8000,
    budgetMaxUsd: 12000,
    tags: ['Solidity', 'React', 'Web3.js'],
    status: 'pending',
    scopeExpected: 'Integration complete front + smart contracts pour dashboard DeFi, tests unitaires inclus.',
    scopeDelivered: 'Phase de cadrage terminee, POC front livre.',
    clientId: 20,
    createdAt: '2025-12-03T08:00:00Z',
  },
  {
    id: 'job-2',
    title: 'Smart Contract Auditor',
    companyName: 'Security Firm',
    location: 'USA/EU',
    postedAt: '2025-11-28T09:00:00Z',
    jobType: 'contract',
    budgetMinUsd: 15000,
    budgetMaxUsd: 15000,
    tags: ['Solidity', 'Security', 'Hardhat'],
    status: 'active',
    scopeExpected: 'Audit complet avec rapport, couverture de tests et recommandations de mitigation.',
    scopeDelivered: 'Revue partielle des contrats, rapport intermediaire fourni.',
    clientId: 14,
    createdAt: '2025-11-28T09:00:00Z',
  },
  {
    id: 'job-3',
    title: 'Blockchain Consultant',
    companyName: 'StartupDAO',
    location: 'Remote',
    postedAt: '2025-12-02T12:00:00Z',
    jobType: 'part-time',
    budgetMinUsd: 5000,
    budgetMaxUsd: 5000,
    tags: ['DeFi', 'Tokenomics', 'Strategy'],
    status: 'approved',
    scopeExpected: 'Roadmap tokenomics, strategie de gouvernance, ateliers produit.',
    scopeDelivered: 'Roadmap et livrables valides, ateliers completes.',
    clientId: 15,
    createdAt: '2025-12-02T12:00:00Z',
  },
  {
    id: 'job-4',
    title: 'UI/UX Web3 Designer',
    companyName: 'Layer2 Labs',
    location: 'Remote',
    postedAt: '2025-12-04T10:00:00Z',
    jobType: 'contract',
    budgetMinUsd: 3500,
    budgetMaxUsd: 3500,
    tags: ['Figma', 'Design System', 'Web3'],
    status: 'dispute',
    scopeExpected: 'Maquettes completes du dashboard, handoff Figma + specs responsive.',
    scopeDelivered: 'Premieres maquettes livre, sections manquantes selon client.',
    clientId: 16,
    createdAt: '2025-12-04T10:00:00Z',
  },
]

const jobApplications = [
  {
    id: 'app-job1-1',
    jobId: 'job-1',
    userId: 3,
    message: 'Ready to lead front+SC integration.',
    status: 'review',
    createdAt: '2025-12-03T14:00:00Z',
    note: 'A realise un bridge L2 similaire, dispo immediate.',
    availability: '20 hrs/week',
    rateUsdHour: 110,
  },
  {
    id: 'app-job1-2',
    jobId: 'job-1',
    userId: 4,
    message: 'Focus on responsive dashboards.',
    status: 'review',
    createdAt: '2025-12-03T15:00:00Z',
    note: 'A livre plusieurs dashboards DeFi responsive.',
    availability: '25 hrs/week',
    rateUsdHour: 95,
  },
  {
    id: 'app-job1-3',
    jobId: 'job-1',
    userId: 5,
    message: 'Security + gas optimization.',
    status: 'review',
    createdAt: '2025-12-03T15:30:00Z',
    note: 'Focus sur securite et gas optimisation.',
    availability: '15 hrs/week',
    rateUsdHour: 120,
  },
  {
    id: 'app-job1-4',
    jobId: 'job-1',
    userId: 6,
    message: 'Product engineer to own UI.',
    status: 'review',
    createdAt: '2025-12-03T16:00:00Z',
    note: 'Peut prendre la partie produit + livrables UI.',
    availability: '18 hrs/week',
    rateUsdHour: 105,
  },
  {
    id: 'app-job2-1',
    jobId: 'job-2',
    userId: 7,
    message: 'Audit complet coverage.',
    status: 'review',
    createdAt: '2025-11-29T08:00:00Z',
    note: 'Audits DeFi $80M TVL, livre rapports detailles.',
    availability: '15 hrs/week',
    rateUsdHour: 150,
  },
  {
    id: 'app-job2-2',
    jobId: 'job-2',
    userId: 8,
    message: 'Rapports concis, focus vuln.',
    status: 'review',
    createdAt: '2025-11-29T09:00:00Z',
    note: 'Rapports concis, focus sur vulnerabilites logiques.',
    availability: '10 hrs/week',
    rateUsdHour: 140,
  },
  {
    id: 'app-job2-3',
    jobId: 'job-2',
    userId: 9,
    message: 'Security researcher plan.',
    status: 'review',
    createdAt: '2025-11-29T10:00:00Z',
    note: 'Audit AMM/bridge, propose un plan de mitigation.',
    availability: '12 hrs/week',
    rateUsdHour: 160,
  },
  {
    id: 'app-job2-4',
    jobId: 'job-2',
    userId: 10,
    message: 'Smart contract security focus.',
    status: 'review',
    createdAt: '2025-11-29T11:00:00Z',
    note: 'Experience sur options/derivatives protocoles.',
    availability: '10 hrs/week',
    rateUsdHour: 145,
  },
  {
    id: 'app-job3-1',
    jobId: 'job-3',
    userId: 11,
    message: 'Tokenomics roadmap.',
    status: 'accepted',
    createdAt: '2025-12-02T18:00:00Z',
    note: 'A pilote 2 DAO sur leur phase de lancement.',
    availability: '8 hrs/week',
    rateUsdHour: 100,
  },
  {
    id: 'app-job4-1',
    jobId: 'job-4',
    userId: 12,
    message: 'Product designer ready.',
    status: 'review',
    createdAt: '2025-12-04T12:00:00Z',
    note: 'A livre des dashboards DeFi responsives.',
    availability: '15 hrs/week',
    rateUsdHour: 85,
  },
  {
    id: 'app-job4-2',
    jobId: 'job-4',
    userId: 13,
    message: 'UX/UI designer focus onboarding.',
    status: 'review',
    createdAt: '2025-12-04T13:00:00Z',
    note: 'Focus sur flows KYC/onboarding crypto.',
    availability: '18 hrs/week',
    rateUsdHour: 90,
  },
]

const contracts = [
  {
    id: 'contract-1',
    title: 'DeFi Platform Development',
    companyName: 'CryptoVentures LLC',
    amountUsd: 9600,
    periodStart: '2025-12-01',
    periodEnd: '2026-01-31',
    status: 'active',
    scopeExpected: 'Integration complete front + smart contracts pour dashboard DeFi, tests unitaires inclus.',
    scopeDelivered: 'Phase de cadrage terminee, POC front livre.',
    createdAt: '2025-11-20',
    clientId: 1,
    freelancerId: 2,
    jobId: 'job-1',
    smartContractId: 'sc-1',
  },
  {
    id: 'contract-2',
    title: 'Smart Contract Audit',
    companyName: 'BlockChain Inc',
    amountUsd: 240000,
    periodStart: '2025-12-15',
    periodEnd: '2025-12-30',
    status: 'signed',
    scopeExpected: 'Audit complet + rapport final + recommandations de mitigation.',
    scopeDelivered: 'Audit partiel, rapport intermediaire fourni.',
    createdAt: '2025-11-15',
    clientId: 18,
    freelancerId: 2,
    jobId: 'job-2',
    smartContractId: 'sc-2',
  },
  {
    id: 'contract-3',
    title: 'NFT Marketplace Contract',
    companyName: 'Digital Arts Co',
    amountUsd: 8000,
    periodStart: '2025-12-10',
    periodEnd: '2026-02-10',
    status: 'pending',
    scopeExpected: 'Livraison front + mint flow.',
    scopeDelivered: 'Kickoff en cours.',
    createdAt: '2025-11-25',
    clientId: 17,
    freelancerId: 2,
    jobId: null,
    smartContractId: 'sc-3',
  },
  {
    id: 'contract-4',
    title: 'Layer2 UI/UX Retainer',
    companyName: 'Layer2 Labs',
    amountUsd: 12000,
    periodStart: '2025-11-01',
    periodEnd: '2025-12-15',
    status: 'litige',
    scopeExpected: 'Maquettes completes desktop et mobile, handoff Figma + spec responsive.',
    scopeDelivered: 'MVP design livre a 70%, handoff incomplet sur mobile.',
    createdAt: '2025-10-30',
    clientId: 16,
    freelancerId: 2,
    jobId: 'job-4',
    smartContractId: 'sc-4',
  },
]

const transactions = [
  {
    id: 'tx-1',
    label: 'Payment from CryptoVentures',
    amountUsd: 4800,
    date: '2025-12-01T10:00:00Z',
    status: 'completed',
    direction: 'in',
    txHash: '0x111',
    contractId: 'contract-1',
  },
  {
    id: 'tx-2',
    label: 'Milestone payment - NFT Project',
    amountUsd: 3650,
    date: '2025-11-28T15:00:00Z',
    status: 'completed',
    direction: 'in',
    txHash: '0x222',
    contractId: 'contract-3',
  },
  {
    id: 'tx-3',
    label: 'Platform fees',
    amountUsd: 95,
    date: '2025-11-27T11:00:00Z',
    status: 'completed',
    direction: 'out',
    txHash: '0x333',
    contractId: null,
  },
  {
    id: 'tx-4',
    label: 'Client deposit',
    amountUsd: 55000,
    date: '2025-11-25T09:00:00Z',
    status: 'pending',
    direction: 'in',
    txHash: '0x444',
    contractId: 'contract-2',
  },
]

const smartContracts = [
  {
    id: 'sc-1',
    chain: 'Polygon',
    contractAddress: '0xAAA1',
    txHash: '0xabc1',
    type: 'MilestoneEscrow',
    amountStaked: 9600,
    status: 'funded',
    createdAt: '2025-11-20',
    contractId: 'contract-1',
  },
  {
    id: 'sc-2',
    chain: 'Ethereum',
    contractAddress: '0xBBB2',
    txHash: '0xabc2',
    type: 'AuditRetainer',
    amountStaked: 240000,
    status: 'pending',
    createdAt: '2025-11-18',
    contractId: 'contract-2',
  },
  {
    id: 'sc-3',
    chain: 'Base',
    contractAddress: '0xCCC3',
    txHash: '0xabc3',
    type: 'MilestoneEscrow',
    amountStaked: 8000,
    status: 'funded',
    createdAt: '2025-11-28',
    contractId: 'contract-3',
  },
  {
    id: 'sc-4',
    chain: 'Arbitrum',
    contractAddress: '0xDDD4',
    txHash: '0xabc4',
    type: 'DesignRetainer',
    amountStaked: 12000,
    status: 'dispute',
    createdAt: '2025-10-30',
    contractId: 'contract-4',
  },
]

const daos = [
  {
    id: 'dao-1',
    name: 'Layer2 Collective',
    description: 'DAO d arbitrage et treasury pour Layer2 projects.',
    createdAt: '2023-05-01T00:00:00Z',
  },
]

const daoMembers = [
  { id: 'membership-1', daoId: 'dao-1', userId: 2, role: 'Contributor', joinedAt: '2023-05-10T00:00:00Z' },
  { id: 'membership-2', daoId: 'dao-1', userId: 16, role: 'Client', joinedAt: '2024-01-12T00:00:00Z' },
  { id: 'membership-3', daoId: 'dao-1', userId: 17, role: 'Client', joinedAt: '2024-05-15T00:00:00Z' },
]

const daoDisputesRaw = [
  {
    id: 'dispute-1',
    contractId: 'contract-4',
    title: 'Layer2 UI/UX Retainer',
    descriptionExpected: 'Maquettes completes desktop et mobile, handoff Figma + spec responsive.',
    descriptionDelivered: 'Maquettes livre a 70%, handoff incomplet sur mobile.',
    amountUsd: 12000,
    periodStart: '2025-11-01',
    periodEnd: '2025-12-15',
    votesFavorable: 62,
    votesTotal: 100,
    status: 'Litige',
  },
  {
    id: 'dispute-2',
    contractId: 'contract-2',
    title: 'Smart Contract Audit',
    descriptionExpected: 'Audit complet + rapport final + recommandations de mitigation.',
    descriptionDelivered: 'Audit partiel, rapport intermediaire fourni.',
    amountUsd: 240000,
    periodStart: '2025-12-15',
    periodEnd: '2025-12-30',
    votesFavorable: 48,
    votesTotal: 100,
    status: 'Litige',
  },
]

const messages = [
  {
    id: 'msg-1',
    senderId: 1,
    recipientId: 2,
    contractId: 'contract-1',
    content: "Hi! How's the project going?",
    sentAt: '2025-12-05T10:30:00Z',
    isRead: false,
  },
  {
    id: 'msg-2',
    senderId: 2,
    recipientId: 1,
    contractId: 'contract-1',
    content: "Great! I'm finishing the final touches on the UI.",
    sentAt: '2025-12-05T10:32:00Z',
    isRead: true,
  },
  {
    id: 'msg-3',
    senderId: 1,
    recipientId: 2,
    contractId: 'contract-1',
    content: 'Perfect! When can we expect delivery?',
    sentAt: '2025-12-05T10:33:00Z',
    isRead: false,
  },
  {
    id: 'msg-4',
    senderId: 2,
    recipientId: 1,
    contractId: 'contract-1',
    content: 'Should be ready by Friday as planned.',
    sentAt: '2025-12-05T10:35:00Z',
    isRead: true,
  },
  {
    id: 'msg-5',
    senderId: 17,
    recipientId: 2,
    contractId: 'contract-3',
    content: 'Can you share the latest NFT drop preview?',
    sentAt: '2025-12-05T09:12:00Z',
    isRead: false,
  },
  {
    id: 'msg-6',
    senderId: 2,
    recipientId: 17,
    contractId: 'contract-3',
    content: 'Uploading now, will ping when done.',
    sentAt: '2025-12-05T09:14:00Z',
    isRead: true,
  },
  {
    id: 'msg-7',
    senderId: 17,
    recipientId: 2,
    contractId: 'contract-3',
    content: 'Thanks! Make sure mobile is covered.',
    sentAt: '2025-12-05T09:20:00Z',
    isRead: false,
  },
  {
    id: 'msg-8',
    senderId: 18,
    recipientId: 2,
    contractId: 'contract-2',
    content: 'Reminder: audit call at 2 PM UTC.',
    sentAt: '2025-12-05T08:00:00Z',
    isRead: false,
  },
  {
    id: 'msg-9',
    senderId: 2,
    recipientId: 18,
    contractId: 'contract-2',
    content: 'Confirmed. I will bring the coverage report.',
    sentAt: '2025-12-05T08:05:00Z',
    isRead: true,
  },
]

const db = {
  users,
  projects,
  jobs,
  jobApplications,
  contracts,
  transactions,
  smartContracts,
  daos,
  daoMembers,
  daoDisputes: daoDisputesRaw,
  messages,
}

const formatCurrency = (value = 0) => `${value.toLocaleString('en-US')} USDC`
const formatRate = (value) => (typeof value === 'number' ? `${value} USDC/hr` : 'Rate shared on request')
const formatDateLabel = (value, options) => new Date(value).toLocaleDateString('en-US', options)
const formatShortDate = (value) => formatDateLabel(value, { month: 'short', day: 'numeric' })
const formatFullDate = (value) => formatDateLabel(value, { month: 'short', day: 'numeric', year: 'numeric' })
const formatPeriod = (start, end) => (start && end ? `${formatShortDate(start)} - ${formatShortDate(end)}` : '')
const formatTimeLabel = (value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const formatRelativePosted = (value) => {
  if (!value) return ''
  const diff = Math.round((NOW - new Date(value)) / DAY_MS)
  if (diff <= 0) return 'Today'
  if (diff === 1) return '1 day ago'
  if (diff < 7) return `${diff} days ago`
  if (diff < 14) return '1 week ago'
  return `${Math.floor(diff / 7)} weeks ago`
}

const findUser = (id) => db.users.find((user) => user.id === id)

const jobStatusLabels = {
  pending: 'En Attente',
  active: 'En Cours',
  approved: 'Valide',
  dispute: 'Litige',
}

const jobTypeLabels = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  contract: 'Contract',
}

const buildBudgetLabel = (job) => {
  const suffix = job.jobType === 'contract' ? 'USDC' : 'USDC/month'
  const min = job.budgetMinUsd || job.budgetMaxUsd || 0
  const max = job.budgetMaxUsd || job.budgetMinUsd || 0
  if (job.budgetMinUsd && job.budgetMaxUsd && job.budgetMinUsd !== job.budgetMaxUsd) {
    return `${min.toLocaleString('en-US')}-${max.toLocaleString('en-US')} ${suffix}`
  }
  return `${max.toLocaleString('en-US')} ${suffix}`
}

const buildApplicant = (application) => {
  const user = findUser(application.userId)
  const rate = application.rateUsdHour ?? user?.rateHourlyUsd
  const availability = application.availability || user?.availability
  return {
    id: application.id,
    name: user?.username || 'Candidate',
    title: user?.title || '',
    rate: formatRate(rate),
    availability,
    skills: user?.skills || [],
    note: application.note,
    profile: {
      name: user?.username || 'Candidate',
      title: user?.title || '',
      location: user?.location || '',
      rate: formatRate(rate),
      availability,
      bio: user?.bio || '',
      skills: user?.skills || [],
      highlights: user?.highlights || [],
      portfolio: user?.portfolio || [],
    },
  }
}

const jobApplicationsByJob = db.jobApplications
  .slice()
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  .reduce((acc, application) => {
    const list = acc.get(application.jobId) || []
    list.push(buildApplicant(application))
    acc.set(application.jobId, list)
    return acc
  }, new Map())

const getApplicantsForJob = (jobId) => jobApplicationsByJob.get(jobId) || []

export const jobData = db.jobs.map((job) => ({
  id: job.id,
  title: job.title,
  company: job.companyName,
  location: job.location,
  posted: formatRelativePosted(job.postedAt),
  type: jobTypeLabels[job.jobType] || job.jobType,
  status: jobStatusLabels[job.status] || job.status,
  tags: job.tags,
  budget: buildBudgetLabel(job),
  expected: job.scopeExpected,
  delivered: job.scopeDelivered,
  applicants: getApplicantsForJob(job.id),
}))

export const contractData = db.contracts.map((contract) => ({
  name: contract.title,
  client: contract.companyName,
  amount: formatCurrency(contract.amountUsd),
  period: formatPeriod(contract.periodStart, contract.periodEnd),
  status: contract.status,
}))

export const overviewData = {
  projects: db.projects.map((project) => ({
    name: project.title,
    client: project.companyName,
    amount: formatCurrency(project.amountUsd),
    deadline: formatShortDate(project.deadline),
    status: project.status,
  })),
  transactions: db.transactions.map((transaction) => ({
    title: transaction.label,
    date: formatFullDate(transaction.date),
    amount: `${transaction.direction === 'out' ? '-' : '+'}${formatCurrency(transaction.amountUsd)}`,
    status: transaction.status,
    type: transaction.direction === 'out' ? 'out' : 'in',
  })),
}

export const daoDisputes = db.daoDisputes.map((dispute) => {
  const contract = db.contracts.find((item) => item.id === dispute.contractId)
  return {
    id: dispute.id,
    name: contract?.title || dispute.title,
    client: contract?.companyName || findUser(contract?.clientId)?.username || '',
    amount: formatCurrency(dispute.amountUsd || contract?.amountUsd || 0),
    period: formatPeriod(dispute.periodStart || contract?.periodStart, dispute.periodEnd || contract?.periodEnd),
    expected: dispute.descriptionExpected,
    delivered: dispute.descriptionDelivered,
    status: dispute.status,
    votesFor: dispute.votesFavorable,
    totalVoters: dispute.votesTotal,
  }
})

const conversationsMap = db.messages
  .filter((message) => message.senderId === ACTIVE_USER_ID || message.recipientId === ACTIVE_USER_ID)
  .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
  .reduce((acc, message) => {
    const counterpartId = message.senderId === ACTIVE_USER_ID ? message.recipientId : message.senderId
    const counterpart = findUser(counterpartId)
    const name = counterpart?.username || `User ${counterpartId}`
    const existing = acc.get(name) || { name, lastMessage: '', thread: [] }
    existing.thread.push({
      id: message.id,
      from: message.senderId === ACTIVE_USER_ID ? 'me' : 'client',
      author: message.senderId === ACTIVE_USER_ID ? 'You' : name,
      text: message.content,
      time: formatTimeLabel(message.sentAt),
    })
    existing.lastMessage = `Last message ${formatTimeLabel(message.sentAt)}`
    acc.set(name, existing)
    return acc
  }, new Map())

export const messagesData = {
  conversations: Array.from(conversationsMap.values()).map((item) => ({
    name: item.name,
    lastMessage: item.lastMessage,
  })),
  threads: Object.fromEntries(Array.from(conversationsMap.entries()).map(([name, item]) => [name, item.thread])),
}

const profileOwner = findUser(ACTIVE_USER_ID) || {}

export const profileData = {
  name: profileOwner.username || '',
  title: profileOwner.title || '',
  location: profileOwner.location || '',
  rate: formatRate(profileOwner.rateHourlyUsd),
  availability: profileOwner.availability || '',
  bio: profileOwner.bio || '',
  skills: profileOwner.skills || [],
  highlights: profileOwner.highlights || [],
  portfolio: profileOwner.portfolio || [],
}

const totalBalance = db.transactions.reduce((acc, transaction) =>
  transaction.direction === 'out' ? acc - transaction.amountUsd : acc + transaction.amountUsd,
0)
const activeProjects = db.projects.filter((project) => project.status === 'active').length
const uniqueClients = new Set(db.projects.map((project) => project.clientId)).size
const monthlyRevenue = db.transactions
  .filter((transaction) => {
    const date = new Date(transaction.date)
    return (
      transaction.direction === 'in' &&
      date.getUTCFullYear() === NOW.getUTCFullYear() &&
      date.getUTCMonth() === NOW.getUTCMonth()
    )
  })
  .reduce((acc, transaction) => acc + transaction.amountUsd, 0)

export const summaryCards = [
  { title: 'Total Balance', value: formatCurrency(totalBalance), change: '+12.5%', trend: 'up', icon: 'wallet' },
  { title: 'Active Projects', value: String(activeProjects), change: '+1 vs Oct', trend: 'up', icon: 'briefcase' },
  { title: 'Total Clients', value: String(uniqueClients), change: '+1 new', trend: 'up', icon: 'users' },
  { title: 'Monthly Revenue', value: formatCurrency(monthlyRevenue), change: '+18.2%', trend: 'up', icon: 'chart' },
]

export const mockDatabase = db
