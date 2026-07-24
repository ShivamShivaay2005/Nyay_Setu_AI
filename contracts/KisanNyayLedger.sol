// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KisanNyayLedger
 * @dev Immutable ledger for storing crop damage claims verification proofs.
 * Designed for "Nyay Setu AI – Kisan Nyay Ledger" hackathon MVP.
 */
contract KisanNyayLedger {
    
    // Address of the smart contract administrator (e.g. Government Department)
    address public admin;

    // Mapping to store authorization of registered officers
    mapping(address => bool) public authorizedOfficers;

    // Struct to store claim details on-chain
    struct ClaimRecord {
        string claimId;         // Unique Claim ID from Supabase
        string evidenceHash;    // IPFS hash or SHA-256 hash of image and reports
        string status;          // 'approved', 'rejected', 'more_evidence', 'appealed'
        uint256 timestamp;      // Timestamp of blockchain entry
        address officerWallet;  // Wallet address of the deciding officer
        bool isExist;           // Helper to check if claim exists
    }

    // Mapping from Claim ID string to the ClaimRecord struct
    mapping(string => ClaimRecord) private claims;

    // Array to store all claim IDs for indexing/retrieval
    string[] private claimIds;

    // Events for real-time dapp tracking
    event ClaimRegistered(
        string indexed claimId, 
        string evidenceHash, 
        string status, 
        address indexed officerWallet
    );
    
    event ClaimStatusUpdated(
        string indexed claimId, 
        string newStatus, 
        string newEvidenceHash, 
        address indexed officerWallet
    );

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyOfficer() {
        require(authorizedOfficers[msg.sender] || msg.sender == admin, "Not an authorized officer");
        _;
    }

    /**
     * @dev Constructor sets the deployer as admin and authorizes them as an officer.
     */
    constructor() {
        admin = msg.sender;
        authorizedOfficers[msg.sender] = true;
    }

    /**
     * @dev Authorize a government officer's wallet address.
     * @param _officer Address of the officer to authorize.
     */
    function authorizeOfficer(address _officer) external onlyAdmin {
        authorizedOfficers[_officer] = true;
    }

    /**
     * @dev De-authorize a government officer's wallet address.
     * @param _officer Address of the officer to remove.
     */
    function revokeOfficer(address _officer) external onlyAdmin {
        authorizedOfficers[_officer] = false;
    }

    /**
     * @dev Stores a new claim on-chain with its cryptographic evidence hash and initial status.
     * @param _claimId Unique ID of the claim.
     * @param _evidenceHash Keccak256 or SHA256 of the claim image + geolocation data.
     * @param _status Current status.
     */
    function createClaim(
        string calldata _claimId,
        string calldata _evidenceHash,
        string calldata _status
    ) external onlyOfficer {
        require(!claims[_claimId].isExist, "Claim already registered on-chain");
        require(bytes(_claimId).length > 0, "Claim ID cannot be empty");
        require(bytes(_evidenceHash).length > 0, "Evidence hash cannot be empty");

        claims[_claimId] = ClaimRecord({
            claimId: _claimId,
            evidenceHash: _evidenceHash,
            status: _status,
            timestamp: block.timestamp,
            officerWallet: msg.sender,
            isExist: true
        });

        claimIds.push(_claimId);

        emit ClaimRegistered(_claimId, _evidenceHash, _status, msg.sender);
    }

    /**
     * @dev Updates the status of an existing claim on-chain.
     * @param _claimId Unique ID of the claim.
     * @param _newStatus New status.
     * @param _newEvidenceHash Updated evidence hash (or existing hash).
     */
    function updateStatus(
        string calldata _claimId,
        string calldata _newStatus,
        string calldata _newEvidenceHash
    ) external onlyOfficer {
        require(claims[_claimId].isExist, "Claim does not exist on-chain");
        
        ClaimRecord storage claim = claims[_claimId];
        claim.status = _newStatus;
        claim.evidenceHash = _newEvidenceHash;
        claim.timestamp = block.timestamp;
        claim.officerWallet = msg.sender;

        emit ClaimStatusUpdated(_claimId, _newStatus, _newEvidenceHash, msg.sender);
    }

    /**
     * @dev Fetches claim details using its Claim ID.
     * @param _claimId Unique ID of the claim.
     */
    function getClaim(string calldata _claimId) external view returns (
        string memory claimId,
        string memory evidenceHash,
        string memory status,
        uint256 timestamp,
        address officerWallet
    ) {
        require(claims[_claimId].isExist, "Claim not found on-chain");
        ClaimRecord memory claim = claims[_claimId];
        return (
            claim.claimId,
            claim.evidenceHash,
            claim.status,
            claim.timestamp,
            claim.officerWallet
        );
    }

    /**
     * @dev Returns total claims stored on-chain.
     */
    function getTotalClaimsCount() external view returns (uint256) {
        return claimIds.length;
    }
}
