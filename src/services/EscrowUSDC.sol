// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract EscrowUSDC {
    IERC20 public immutable usdc;
    address public immutable admin;

    struct ContractData {
        address employer;
        address freelancer;
        uint256 amount;           // montant en USDC (6 décimales)
        bool released;
        bool disputed;
        uint256 adminVotesRelease;
        uint256 adminVotesRefund;
        bool exists;
    }

    // id => data
    mapping(uint256 => ContractData) public contracts;
    uint256 public nextId;

    // admins off-chain (multi-admin possible)
    mapping(address => bool) public isAdmin;

    // anti double vote
    mapping(uint256 => mapping(address => bool)) public hasVotedRelease;
    mapping(uint256 => mapping(address => bool)) public hasVotedRefund;

    // fees
    uint256 public constant PLATFORM_FEE_BPS = 500;   // 5%  (500 / 10000)
    uint256 public constant DISPUTE_FEE_BPS  = 1500;  // 15% (1500 / 10000)
    uint256 public constant BPS_DENOMINATOR  = 10000;

    // ==== EVENTS ====

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed employer,
        address indexed freelancer,
        uint256 amount
    );

    event Disputed(uint256 indexed escrowId);
    event Released(uint256 indexed escrowId);
    event Refunded(uint256 indexed escrowId);
    event AdminAdded(address indexed account);

    // ==== CONSTRUCTOR ====

    /// @param usdcAddress adresse du token USDC (6 décimales)
    /// @param adminAddress wallet admin (reçoit fees)
    constructor(address usdcAddress, address adminAddress) {
        require(usdcAddress != address(0), "USDC address required");
        require(adminAddress != address(0), "admin address required");

        usdc = IERC20(usdcAddress);
        admin = adminAddress;
        isAdmin[adminAddress] = true;

        emit AdminAdded(adminAddress);
    }

    // ==== ADMIN MANAGEMENT ====

    function addAdmin(address account) external {
        require(msg.sender == admin, "only root admin");
        require(account != address(0), "zero address");
        isAdmin[account] = true;
        emit AdminAdded(account);
    }

    // ==== ESCROW FLOW ====

    /// @notice crée un escrow et prélève 5% de fees à l'admin
    /// @param freelancer wallet du freelance
    /// @param amount montant total *en unités USDC* (6 décimales)
    function createEscrow(address freelancer, uint256 amount) external {
        require(freelancer != address(0), "invalid freelancer");
        require(amount > 0, "invalid amount");

        // 5% fees pour la plateforme
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 escrowAmount = amount - platformFee;

        // transfert des fonds : employer -> admin + contrat
        require(usdc.transferFrom(msg.sender, admin, platformFee), "platform fee failed");
        require(usdc.transferFrom(msg.sender, address(this), escrowAmount), "escrow transfer failed");

        contracts[nextId] = ContractData({
            employer: msg.sender,
            freelancer: freelancer,
            amount: escrowAmount,
            released: false,
            disputed: false,
            adminVotesRelease: 0,
            adminVotesRefund: 0,
            exists: true
        });

        emit EscrowCreated(nextId, msg.sender, freelancer, escrowAmount);

        nextId++;
    }

    /// @notice release direct par l'employeur (pas en litige)
    function release(uint256 id) external {
        ContractData storage c = contracts[id];
        require(c.exists, "unknown escrow");
        require(msg.sender == c.employer, "not employer");
        require(!c.released, "already released");
        require(!c.disputed, "in dispute");

        c.released = true;

        require(usdc.transfer(c.freelancer, c.amount), "transfer failed");

        emit Released(id);
    }

    /// @notice ouverture d'un litige
    function dispute(uint256 id) external {
        ContractData storage c = contracts[id];
        require(c.exists, "unknown escrow");
        require(msg.sender == c.employer || msg.sender == c.freelancer, "not participant");
        require(!c.disputed, "already disputed");
        require(!c.released, "already released");

        c.disputed = true;

        emit Disputed(id);
    }

    /// @notice vote admin pour libérer au freelance (avec fees litige 15%)
    function adminVoteRelease(uint256 id) external {
        ContractData storage c = contracts[id];
        require(c.exists, "unknown escrow");
        require(isAdmin[msg.sender], "not admin");
        require(c.disputed, "not disputed");
        require(!c.released, "already released");
        require(!hasVotedRelease[id][msg.sender], "already voted");

        hasVotedRelease[id][msg.sender] = true;
        c.adminVotesRelease++;

        if (c.adminVotesRelease >= 2) {
            _payoutToFreelancer(id, c);
        }
    }

    /// @notice vote admin pour rembourser l'employeur (avec fees litige 15%)
    function adminVoteRefund(uint256 id) external {
        ContractData storage c = contracts[id];
        require(c.exists, "unknown escrow");
        require(isAdmin[msg.sender], "not admin");
        require(c.disputed, "not disputed");
        require(!c.released, "already released");
        require(!hasVotedRefund[id][msg.sender], "already voted");

        hasVotedRefund[id][msg.sender] = true;
        c.adminVotesRefund++;

        if (c.adminVotesRefund >= 2) {
            _refundEmployer(id, c);
        }
    }

    // ==== INTERNAL PAYOUT LOGIC ====

    function _payoutToFreelancer(uint256 id, ContractData storage c) internal {
        // 15% dispute fee
        uint256 fee = (c.amount * DISPUTE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = c.amount - fee;

        c.released = true;
        c.disputed = false;
        uint256 toTransfer = c.amount;
        c.amount = 0; // reentrancy safety (even if ERC20 is standard)

        require(usdc.transfer(admin, fee), "fee transfer failed");
        require(usdc.transfer(c.freelancer, netAmount), "payout failed");

        emit Released(id);
    }

    function _refundEmployer(uint256 id, ContractData storage c) internal {
        uint256 fee = (c.amount * DISPUTE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = c.amount - fee;

        c.released = false;
        c.disputed = false;
        uint256 toTransfer = c.amount;
        c.amount = 0;

        require(usdc.transfer(admin, fee), "fee transfer failed");
        require(usdc.transfer(c.employer, netAmount), "refund failed");

        emit Refunded(id);
    }
}
